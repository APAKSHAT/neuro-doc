import { NextResponse } from 'next/server'

export async function GET() {
  try {
    // Mock clauses data for development
    const clauses = [
      {
        id: "1",
        title: "Coverage Limits",
        content: "The maximum amount payable under this policy for any single claim shall not exceed $100,000. This limit applies per occurrence and is subject to the annual aggregate limit specified in the declarations.",
        source_file: "policy-document.pdf",
        page_number: 5,
        relevance_score: 0.95,
        category: "coverage",
        created_at: new Date().toISOString()
      },
      {
        id: "2", 
        title: "Deductible Requirements",
        content: "A deductible of $500 applies to all claims under this policy. The deductible must be satisfied before any benefits are payable by the insurer.",
        source_file: "policy-document.pdf",
        page_number: 7,
        relevance_score: 0.88,
        category: "deductible",
        created_at: new Date().toISOString()
      },
      {
        id: "3",
        title: "Exclusions - War and Nuclear",
        content: "This policy does not cover damage caused by war, nuclear hazard, or intentional acts. This includes but is not limited to acts of terrorism and government confiscation.",
        source_file: "policy-document.pdf", 
        page_number: 12,
        relevance_score: 0.92,
        category: "exclusions",
        created_at: new Date().toISOString()
      },
      {
        id: "4",
        title: "Claims Procedure",
        content: "All claims must be reported within 30 days of the incident. Failure to provide timely notice may result in denial of the claim.",
        source_file: "claims-handbook.pdf",
        page_number: 3,
        relevance_score: 0.85,
        category: "claims",
        created_at: new Date().toISOString()
      },
      {
        id: "5",
        title: "Liability Limits",
        content: "The liability coverage under this policy is limited to $1,000,000 per occurrence with a $2,000,000 annual aggregate.",
        source_file: "liability-section.pdf",
        page_number: 2,
        relevance_score: 0.90,
        category: "liability",
        created_at: new Date().toISOString()
      }
    ]

    return NextResponse.json({
      success: true,
      clauses,
      total: clauses.length
    })
  } catch (error) {
    console.error('Error in dev-clauses:', error)
    return NextResponse.json({
      success: false,
      error: 'Failed to fetch clauses'
    }, { status: 500 })
  }
}
