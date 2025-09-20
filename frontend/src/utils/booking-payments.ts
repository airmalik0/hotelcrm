import type { BookingPublic } from "@/client/types.gen"

/**
 * Calculate total refunds from payment adjustments
 */
export function calculateRefundAmount(booking: BookingPublic): number {
  if (
    !booking.payment_adjustments ||
    booking.payment_adjustments.length === 0
  ) {
    return 0.0
  }

  const total = booking.payment_adjustments
    .filter((adj) => adj.amount && adj.amount < 0)
    .reduce((sum, adj) => sum + (adj.amount || 0), 0)

  return Math.abs(total)
}

/**
 * Calculate total additional payments from payment adjustments
 */
export function calculateAdditionalPayment(booking: BookingPublic): number {
  if (
    !booking.payment_adjustments ||
    booking.payment_adjustments.length === 0
  ) {
    return 0.0
  }

  return booking.payment_adjustments
    .filter((adj) => adj.amount && adj.amount > 0)
    .reduce((sum, adj) => sum + (adj.amount || 0), 0)
}

/**
 * Get payment adjustment summary for a booking
 */
export function getPaymentAdjustmentSummary(booking: BookingPublic) {
  return {
    refundAmount: calculateRefundAmount(booking),
    additionalPayment: calculateAdditionalPayment(booking),
    hasAdjustments:
      booking.payment_adjustments && booking.payment_adjustments.length > 0,
  }
}
