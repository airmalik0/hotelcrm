"""
Campaign service layer for centralizing campaign business logic.
"""
import uuid
from datetime import datetime, timedelta, timezone
from typing import TYPE_CHECKING, Any

from sqlmodel import Session, and_, or_, select

from app.core.exceptions import (
    AlreadyExistsError,
    BusinessRuleViolation,
    NotFoundError,
)

if TYPE_CHECKING:
    pass

# Import CRUD classes
from app.crud.booking import booking as crud_booking
from app.crud.campaigns import campaigns as crud_campaigns
from app.crud.campaigns import sms_history as crud_sms_history
from app.crud.customer import customer as crud_customer
from app.models import (
    Campaign,
    CampaignCreate,
    CampaignStatus,
    CampaignType,
    CampaignUpdate,
    Customer,
    SMSHistory,
    SMSStatus,
)
from app.models.common import District, RoomType


class CampaignService:
    """Service class for handling campaign operations and SMS sending."""

    def __init__(self, session: Session):
        """Initialize service with database session."""
        self.session = session
        self.crud_campaigns = crud_campaigns
        self.crud_sms_history = crud_sms_history
        self.crud_customer = crud_customer
        self.crud_booking = crud_booking

    def get_campaign_or_404(self, campaign_id: uuid.UUID) -> Campaign:
        """Get campaign by ID or raise NotFoundError."""
        campaign = self.crud_campaigns.get(self.session, id=campaign_id)
        if not campaign:
            raise NotFoundError("Campaign", str(campaign_id))
        return campaign

    def create_campaign(self, campaign_in: CampaignCreate) -> Campaign:
        """
        Create a new campaign with validations.

        Args:
            campaign_in: Campaign creation data

        Returns:
            Created campaign

        Raises:
            AlreadyExistsError: If campaign with same name exists
            BusinessRuleViolation: If validation fails
        """
        # Check for duplicate campaign names
        existing = self.crud_campaigns.get_by_name(self.session, name=campaign_in.name)
        if existing:
            raise AlreadyExistsError("name", "Campaign with this name already exists")

        # Validate criteria structure
        self._validate_campaign_criteria(campaign_in.criteria)

        # Create campaign using CRUD
        campaign = self.crud_campaigns.create(self.session, obj_in=campaign_in)
        return campaign

    def update_campaign(self, campaign: Campaign, campaign_in: CampaignUpdate) -> Campaign:
        """
        Update a campaign with validations.

        Args:
            campaign: Current campaign
            campaign_in: Update data

        Returns:
            Updated campaign

        Raises:
            BusinessRuleViolation: If validation fails or campaign is running
        """
        # Prevent modification of active trigger campaigns
        if campaign.status == CampaignStatus.ACTIVE and campaign.type == CampaignType.TRIGGER:
            raise BusinessRuleViolation("Cannot modify active trigger campaigns. Pause first.")

        # Check for name conflicts if name is being changed
        if campaign_in.name and campaign_in.name != campaign.name:
            existing = self.crud_campaigns.get_by_name(self.session, name=campaign_in.name)
            if existing and existing.id != campaign.id:
                raise AlreadyExistsError("name", "Campaign with this name already exists")

        # Validate criteria if provided
        if campaign_in.criteria is not None:
            self._validate_campaign_criteria(campaign_in.criteria)

        # Update campaign using CRUD
        campaign = self.crud_campaigns.update(self.session, db_obj=campaign, obj_in=campaign_in)
        return campaign

    def execute_onetime_campaign(self, campaign: Campaign, test_mode: bool = False) -> dict[str, Any]:
        """
        Execute a one-time campaign immediately.

        Args:
            campaign: Campaign to execute
            test_mode: If True, simulate SMS sending (mock)

        Returns:
            Execution results summary

        Raises:
            BusinessRuleViolation: If campaign cannot be executed
        """
        if campaign.type != CampaignType.ONETIME:
            raise BusinessRuleViolation("Only one-time campaigns can be executed directly")

        if campaign.status not in [CampaignStatus.DRAFT, CampaignStatus.ACTIVE]:
            raise BusinessRuleViolation(f"Cannot execute campaign with status: {campaign.status}")

        # Get matching customers
        customers = self._evaluate_customer_criteria(campaign.criteria)

        if not customers:
            return {
                "campaign_id": campaign.id,
                "execution_type": "onetime",
                "customers_matched": 0,
                "sms_sent": 0,
                "sms_failed": 0,
                "test_mode": test_mode,
                "execution_summary": {"message": "No customers matched the criteria"}
            }

        # Send SMS to all matching customers
        sms_sent = 0
        sms_failed = 0

        for customer in customers:
            try:
                sms_record = self._send_sms_to_customer(
                    campaign=campaign,
                    customer=customer,
                    test_mode=test_mode
                )
                if sms_record.status in [SMSStatus.SENT, SMSStatus.MOCK]:
                    sms_sent += 1
                else:
                    sms_failed += 1
            except Exception as e:
                # Log failure but continue with other customers
                self._create_sms_history_record(
                    campaign=campaign,
                    customer=customer,
                    status=SMSStatus.FAILED,
                    error_message=str(e),
                    test_mode=test_mode
                )
                sms_failed += 1

        # Update campaign status and statistics
        campaign.status = CampaignStatus.COMPLETED
        campaign.last_executed_at = datetime.now(timezone.utc)
        campaign.total_sent += sms_sent
        campaign.total_failed += sms_failed
        self.session.add(campaign)

        return {
            "campaign_id": campaign.id,
            "execution_type": "onetime",
            "customers_matched": len(customers),
            "sms_sent": sms_sent,
            "sms_failed": sms_failed,
            "test_mode": test_mode,
            "execution_summary": {
                "message": "Campaign executed successfully",
                "success_rate": (sms_sent / len(customers) * 100) if len(customers) > 0 else 0
            }
        }

    def check_trigger_campaigns(self) -> dict[str, Any]:
        """
        Check all active trigger campaigns and execute for new matching customers.
        Called by external cron job.

        Returns:
            Summary of trigger check results
        """
        # Get all active trigger campaigns using CRUD
        active_triggers = self.crud_campaigns.get_active_triggers(self.session)

        execution_details = []
        total_campaigns_executed = 0
        total_sms_sent = 0

        for campaign in active_triggers:
            try:
                # Check if campaign should run based on frequency
                if not self._should_trigger_campaign_run(campaign):
                    continue

                # Get customers who match criteria but haven't received SMS from this campaign
                new_customers = self._get_new_matching_customers(campaign)

                if not new_customers:
                    execution_details.append({
                        "campaign_id": str(campaign.id),
                        "campaign_name": campaign.name,
                        "new_customers": 0,
                        "sms_sent": 0,
                        "status": "no_new_matches"
                    })
                    continue

                # Send SMS to new matching customers
                sms_sent = 0
                sms_failed = 0

                for customer in new_customers:
                    try:
                        sms_record = self._send_sms_to_customer(campaign, customer)
                        if sms_record.status == SMSStatus.SENT:
                            sms_sent += 1
                        else:
                            sms_failed += 1
                    except Exception as e:
                        self._create_sms_history_record(
                            campaign=campaign,
                            customer=customer,
                            status=SMSStatus.FAILED,
                            error_message=str(e)
                        )
                        sms_failed += 1

                # Update campaign statistics
                campaign.last_executed_at = datetime.now(timezone.utc)
                campaign.total_sent += sms_sent
                campaign.total_failed += sms_failed
                self.session.add(campaign)

                execution_details.append({
                    "campaign_id": str(campaign.id),
                    "campaign_name": campaign.name,
                    "new_customers": len(new_customers),
                    "sms_sent": sms_sent,
                    "sms_failed": sms_failed,
                    "status": "executed"
                })

                total_campaigns_executed += 1
                total_sms_sent += sms_sent

            except Exception as e:
                execution_details.append({
                    "campaign_id": str(campaign.id),
                    "campaign_name": campaign.name,
                    "error": str(e),
                    "status": "error"
                })

        return {
            "campaigns_checked": len(active_triggers),
            "campaigns_executed": total_campaigns_executed,
            "total_sms_sent": total_sms_sent,
            "execution_details": execution_details
        }

    def preview_campaign_recipients(self, campaign: Campaign) -> dict[str, Any]:
        """
        Preview customers who would receive SMS from this campaign.

        Args:
            campaign: Campaign to preview

        Returns:
            Preview data with matching customers
        """
        matching_customers = self._evaluate_customer_criteria(campaign.criteria)

        # Create preview data (limit to first 50 for performance)
        preview_customers = []
        for customer in matching_customers[:50]:
            age = self._calculate_customer_age(customer) if customer.date_of_birth else None
            days_since_last_visit = None
            if customer.last_booking_date:
                days_since_last_visit = (datetime.now(timezone.utc) - customer.last_booking_date).days

            preview_customers.append({
                "id": str(customer.id),
                "name": f"{customer.first_name} {customer.last_name}",
                "phone": customer.phone,
                "district": customer.district.value if customer.district else None,
                "age": age,
                "total_spent": customer.total_spent,
                "total_bookings": customer.total_bookings,
                "days_since_last_visit": days_since_last_visit
            })

        return {
            "campaign_id": campaign.id,
            "total_matching_customers": len(matching_customers),
            "preview_customers": preview_customers,
            "criteria_applied": campaign.criteria
        }

    def delete_campaign(self, campaign: Campaign) -> None:
        """
        Delete a campaign with business rule validations.

        Args:
            campaign: Campaign to delete

        Raises:
            BusinessRuleViolation: If campaign cannot be deleted
        """
        # Cannot delete active trigger campaigns
        if campaign.status == CampaignStatus.ACTIVE and campaign.type == CampaignType.TRIGGER:
            raise BusinessRuleViolation("Cannot delete active trigger campaigns. Archive first.")

        # Delete associated SMS history first (cascade)
        sms_records = self.session.exec(
            select(SMSHistory).where(SMSHistory.campaign_id == campaign.id)
        ).all()
        for record in sms_records:
            self.session.delete(record)

        # Delete campaign
        self.session.delete(campaign)

    # Private helper methods

    def _validate_campaign_criteria(self, criteria: dict[str, Any]) -> None:
        """Validate campaign criteria structure and values."""
        if not criteria:
            return

        # Validate age criteria
        if "min_age" in criteria:
            if not isinstance(criteria["min_age"], int | float) or criteria["min_age"] < 0:
                raise BusinessRuleViolation("min_age must be a positive number")

        if "max_age" in criteria:
            if not isinstance(criteria["max_age"], int | float) or criteria["max_age"] < 0:
                raise BusinessRuleViolation("max_age must be a positive number")

        if "min_age" in criteria and "max_age" in criteria:
            if criteria["min_age"] > criteria["max_age"]:
                raise BusinessRuleViolation("min_age cannot be greater than max_age")

        # Validate districts
        if "districts" in criteria:
            if not isinstance(criteria["districts"], list):
                raise BusinessRuleViolation("districts must be a list")
            valid_districts = [d.value for d in District]
            for district in criteria["districts"]:
                if district not in valid_districts:
                    raise BusinessRuleViolation(f"Invalid district: {district}")

        # Validate spending criteria
        if "min_total_spent" in criteria:
            if not isinstance(criteria["min_total_spent"], int | float) or criteria["min_total_spent"] < 0:
                raise BusinessRuleViolation("min_total_spent must be a positive number")

        # Validate visit criteria
        if "days_since_last_visit" in criteria:
            if not isinstance(criteria["days_since_last_visit"], int | float) or criteria["days_since_last_visit"] < 0:
                raise BusinessRuleViolation("days_since_last_visit must be a positive number")

        # Validate room types
        if "visited_room_types" in criteria:
            if not isinstance(criteria["visited_room_types"], list):
                raise BusinessRuleViolation("visited_room_types must be a list")
            valid_room_types = [rt.value for rt in RoomType]
            for room_type in criteria["visited_room_types"]:
                if room_type not in valid_room_types:
                    raise BusinessRuleViolation(f"Invalid room type: {room_type}")

    def _evaluate_customer_criteria(self, criteria: dict[str, Any]) -> list[Customer]:
        """
        Evaluate criteria and return matching customers.
        All criteria are combined with AND logic.
        """
        query = select(Customer)
        filters = []

        # Age filtering
        if "min_age" in criteria or "max_age" in criteria:
            current_date = datetime.now(timezone.utc)

            if "min_age" in criteria:
                min_birth_date = current_date - timedelta(days=criteria["min_age"] * 365.25)
                filters.append(Customer.date_of_birth <= min_birth_date)  # type: ignore

            if "max_age" in criteria:
                max_birth_date = current_date - timedelta(days=criteria["max_age"] * 365.25)
                filters.append(Customer.date_of_birth >= max_birth_date)  # type: ignore

        # District filtering
        if "districts" in criteria and criteria["districts"]:
            district_filters = [Customer.district == District(d) for d in criteria["districts"]]
            filters.append(or_(*district_filters))

        # Spending filtering
        if "min_total_spent" in criteria:
            filters.append(Customer.total_spent >= criteria["min_total_spent"])

        # Last visit filtering
        if "days_since_last_visit" in criteria:
            cutoff_date = datetime.now(timezone.utc) - timedelta(days=criteria["days_since_last_visit"])
            filters.append(Customer.last_booking_date <= cutoff_date)  # type: ignore

        # Apply all filters
        if filters:
            query = query.where(and_(*filters))  # type: ignore

        customers = list(self.session.exec(query).all())

        # Room type filtering (requires join with bookings - more complex)
        if "visited_room_types" in criteria and criteria["visited_room_types"]:
            customers = self._filter_by_visited_room_types(customers, criteria["visited_room_types"])

        return customers

    def _filter_by_visited_room_types(self, customers: list[Customer], room_types: list[str]) -> list[Customer]:
        """Filter customers who have visited specific room types."""
        filtered_customers = []

        for customer in customers:
            # Check if customer has bookings with specified room types
            # Use a simpler approach: check customer's booking relationships
            has_visited_room_type = False

            for booking in customer.bookings:
                if booking.room and booking.room.room_type.value in room_types:
                    has_visited_room_type = True
                    break

            if has_visited_room_type:
                filtered_customers.append(customer)

        return filtered_customers

    def _should_trigger_campaign_run(self, campaign: Campaign) -> bool:
        """Check if enough time has passed since last execution based on frequency."""
        if not campaign.trigger_frequency_minutes:
            return False

        if not campaign.last_executed_at:
            return True  # Never executed before

        time_since_last = datetime.now(timezone.utc) - campaign.last_executed_at
        required_interval = timedelta(minutes=campaign.trigger_frequency_minutes)

        return time_since_last >= required_interval

    def _get_new_matching_customers(self, campaign: Campaign) -> list[Customer]:
        """Get customers who match criteria but haven't received SMS from this campaign."""
        # Get all customers who match criteria
        matching_customers = self._evaluate_customer_criteria(campaign.criteria)

        if not matching_customers:
            return []

        # Get customer IDs who already received SMS from this campaign using CRUD
        existing_recipients = self.crud_sms_history.get_campaign_recipients(
            self.session, campaign_id=campaign.id
        )

        # Filter out customers who already received SMS
        new_customers = [
            customer for customer in matching_customers
            if customer.id not in existing_recipients
        ]

        return new_customers

    def _send_sms_to_customer(
        self,
        campaign: Campaign,
        customer: Customer,
        test_mode: bool = False
    ) -> SMSHistory:
        """
        Send SMS to a customer and create history record.

        Args:
            campaign: Campaign sending the SMS
            customer: Customer to send SMS to
            test_mode: If True, create mock SMS record

        Returns:
            SMS history record
        """
        # Personalize message template
        message = self._personalize_message(campaign.message_template, customer)

        # Mock SMS sending (real SMS integration would go here)
        if test_mode:
            status = SMSStatus.MOCK
            error_message = None
        else:
            # In real implementation, integrate with SMS provider here
            # For now, simulate successful sending
            status = SMSStatus.SENT
            error_message = None

        # Create SMS history record
        return self._create_sms_history_record(
            campaign=campaign,
            customer=customer,
            message=message,
            status=status,
            error_message=error_message,
            test_mode=test_mode
        )

    def _create_sms_history_record(
        self,
        campaign: Campaign,
        customer: Customer,
        message: str | None = None,
        status: SMSStatus = SMSStatus.PENDING,
        error_message: str | None = None,
        test_mode: bool = False
    ) -> SMSHistory:
        """Create SMS history record."""
        if not message:
            message = self._personalize_message(campaign.message_template, customer)

        sms_record = SMSHistory(
            campaign_id=campaign.id,
            customer_id=customer.id,
            message=message,
            status=status,
            customer_phone=customer.phone,
            customer_name=f"{customer.first_name} {customer.last_name}",
            error_message=error_message
        )

        self.session.add(sms_record)
        self.session.flush()
        return sms_record

    def _personalize_message(self, template: str, customer: Customer) -> str:
        """Personalize message template with customer data."""
        # Simple template replacement (can be enhanced with more sophisticated templating)
        message = template

        # Replace common placeholders
        replacements = {
            "{first_name}": customer.first_name,
            "{last_name}": customer.last_name,
            "{full_name}": f"{customer.first_name} {customer.last_name}",
        }

        for placeholder, value in replacements.items():
            message = message.replace(placeholder, value)

        return message

    def _calculate_customer_age(self, customer: Customer) -> int | None:
        """Calculate customer age from date of birth."""
        if not customer.date_of_birth:
            return None

        today = datetime.now(timezone.utc)
        age = today.year - customer.date_of_birth.year

        # Adjust if birthday hasn't occurred this year
        if (today.month, today.day) < (customer.date_of_birth.month, customer.date_of_birth.day):
            age -= 1

        return age
