#!/usr/bin/env python3
"""
Debug script to test audit CRUD and understand the Row vs AuditLog object issue.
"""

import logging
from datetime import datetime, timezone
from uuid import uuid4

from sqlmodel import Session, select
from sqlalchemy.orm import selectinload

from app.core.db import engine
from app.models import AuditLog, User
from app.crud.audit import audit as crud_audit

# Configure logging
logging.basicConfig(level=logging.DEBUG)
logger = logging.getLogger(__name__)

def main():
    
    with Session(engine) as session:
        logger.info("Starting audit CRUD debug test")
        
        # First, let's try a direct query without CRUD
        logger.info("=== Direct query test ===")
        direct_stmt = select(AuditLog).limit(1)
        direct_result = session.exec(direct_stmt).first()
        
        if direct_result:
            logger.info(f"Direct query result type: {type(direct_result)}")
            logger.info(f"Direct query is AuditLog: {isinstance(direct_result, AuditLog)}")
            logger.info(f"Direct query has model_dump: {hasattr(direct_result, 'model_dump')}")
        else:
            logger.info("No audit logs found for direct query")
            
        # Test with selectinload
        logger.info("=== Direct query with selectinload ===")
        select_stmt = select(AuditLog).options(selectinload(AuditLog.user)).limit(1)  # type: ignore
        select_result = session.exec(select_stmt).first()
        
        if select_result:
            logger.info(f"Selectinload query result type: {type(select_result)}")
            logger.info(f"Selectinload query is AuditLog: {isinstance(select_result, AuditLog)}")
            logger.info(f"Selectinload query has model_dump: {hasattr(select_result, 'model_dump')}")
            
            # Try to access user attribute
            try:
                user_attr = select_result.user
                logger.info(f"User attribute accessible: {user_attr}")
                if user_attr:
                    logger.info(f"User username: {user_attr.username}")
            except Exception as e:
                logger.error(f"Error accessing user attribute: {e}")
            
            # Try model_dump
            try:
                dump_result = select_result.model_dump()
                logger.info(f"model_dump() successful: {type(dump_result)}")
            except Exception as e:
                logger.error(f"Error calling model_dump(): {e}")
        else:
            logger.info("No audit logs found for selectinload query")
        
        # Test CRUD method
        logger.info("=== CRUD method test ===")
        try:
            crud_result = crud_audit.get_multi_with_filters(session, limit=1)
            if crud_result:
                first_item = crud_result[0]
                logger.info(f"CRUD result type: {type(first_item)}")
                logger.info(f"CRUD result is AuditLog: {isinstance(first_item, AuditLog)}")
                logger.info(f"CRUD result has model_dump: {hasattr(first_item, 'model_dump')}")
                
                # Try model_dump
                try:
                    dump_result = first_item.model_dump()
                    logger.info(f"CRUD model_dump() successful: {type(dump_result)}")
                except Exception as e:
                    logger.error(f"CRUD Error calling model_dump(): {e}")
                    
            else:
                logger.info("No audit logs found via CRUD")
        except Exception as e:
            logger.error(f"CRUD method error: {e}")
        
        # Check if we have any audit logs at all
        logger.info("=== Audit log count ===")
        total_count = session.exec(select(AuditLog)).all()
        logger.info(f"Total audit logs in database: {len(total_count)}")
        
        # If no audit logs, create one for testing
        if len(total_count) == 0:
            logger.info("Creating test audit log...")
            
            # Get or create a test user
            test_user = session.exec(select(User).limit(1)).first()
            if not test_user:
                logger.info("No users found, cannot create audit log")
                return
            
            test_audit = AuditLog(
                user_id=test_user.id,
                action="test_action",
                entity_type="test_entity",
                entity_id=uuid4(),
                entity_name="Test Entity",
                description="Test audit log for debugging",
                timestamp=datetime.now(timezone.utc),
            )
            session.add(test_audit)
            session.commit()
            logger.info("Test audit log created")
            
            # Re-run the tests
            logger.info("=== Re-running tests after creating audit log ===")
            crud_result = crud_audit.get_multi_with_filters(session, limit=1)
            if crud_result:
                first_item = crud_result[0]
                logger.info(f"CRUD result type after creation: {type(first_item)}")
                logger.info(f"CRUD result is AuditLog after creation: {isinstance(first_item, AuditLog)}")

if __name__ == "__main__":
    main()