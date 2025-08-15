import { NextRequest, NextResponse } from 'next/server'

export async function GET(request: NextRequest) {
  try {
    // Return mock recent queries for development/testing
    const queries = [
      {
        id: 'dev-1',
        query: 'Insurance claim for knee surgery - 46-year-old male',
        decision: 'Approved',
        amount: '₹45,000',
        confidence: 92,
        timestamp: '2 hours ago'
      },
      {
        id: 'dev-2', 
        query: 'Dental treatment coverage inquiry',
        decision: 'Requires Review',
        amount: '₹12,500',
        confidence: 76,
        timestamp: '4 hours ago'
      },
      {
        id: 'dev-3',
        query: 'Baggage loss claim - international flight',
        decision: 'Approved',
        amount: '₹8,000', 
        confidence: 88,
        timestamp: '1 day ago'
      },
      {
        id: 'dev-4',
        query: 'Eye surgery refractive error treatment',
        decision: 'Rejected',
        amount: 'N/A',
        confidence: 95,
        timestamp: '2 days ago'
      }
    ]

    return NextResponse.json({
      success: true,
      queries
    })

  } catch (error) {
    console.error('Dev Queries API error:', error)
    return NextResponse.json({
      success: false,
      error: 'Failed to fetch queries'
    }, { status: 500 })
  }
}
