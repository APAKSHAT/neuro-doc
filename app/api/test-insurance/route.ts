import { NextResponse } from 'next/server'
import { analyzeWithAI } from '@/lib/openai'

export async function POST(request: Request) {
  try {
    const body = await request.json()
    const { query } = body
    
    // Sample insurance policy document content
    const policyDocument = `
    MEDICAL INSURANCE POLICY DOCUMENT
    
    COVERAGE DETAILS:
    - Surgery Coverage: All medically necessary surgeries are covered after 6-month waiting period
    - Geographic Coverage: All procedures performed in India are covered
    - Age Limits: Coverage available for individuals aged 18-65 years
    - Pre-existing Conditions: 2-year waiting period for pre-existing conditions
    - Orthopedic Procedures: Knee surgery, hip replacement, and joint procedures covered at 80% after deductible
    
    EXCLUSIONS:
    - Cosmetic procedures
    - Experimental treatments
    - Procedures performed outside India
    - Claims within first 30 days of policy (except accidents)
    
    CLAIM AMOUNTS:
    - Knee Surgery: Up to ₹1,50,000 coverage
    - Room charges: ₹5,000 per day limit
    - Surgeon fees: 80% coverage up to policy limit
    
    WAITING PERIODS:
    - General surgery: 6 months
    - Maternity: 12 months
    - Pre-existing conditions: 24 months
    `
    
    const analysisPrompt = `
    You are an insurance claim processing AI. Analyze this query against the policy document and provide a structured decision.
    
    QUERY: "${query}"
    
    POLICY DOCUMENT: ${policyDocument}
    
    Parse the query to extract:
    1. Age, gender, procedure type, location, policy duration
    2. Check each detail against policy rules
    3. Make approval/rejection decision with clear justification
    
    Provide response in this EXACT JSON format:
    {
      "Decision": "Approved/Rejected/Review Required",
      "Amount": "₹XX,XXX or Not Applicable",
      "Justification": {
        "ageEligibility": "explanation of age check",
        "procedureCoverage": "explanation of procedure coverage", 
        "waitingPeriod": "explanation of waiting period check",
        "geographicCoverage": "explanation of location check",
        "policyDuration": "explanation of policy duration check"
      },
      "ConfidenceScore": 0.XX,
      "ClausesReferenced": ["specific clause 1", "specific clause 2"],
      "RiskFactors": ["factor1", "factor2"],
      "ParsedQuery": {
        "age": "extracted age",
        "gender": "extracted gender", 
        "procedure": "extracted procedure",
        "location": "extracted location",
        "policyDuration": "extracted duration"
      }
    }
    `
    
    const analysis = await analyzeWithAI(analysisPrompt)
    
    return NextResponse.json({
      success: true,
      query: query,
      analysis: analysis,
      timestamp: new Date().toISOString()
    })

  } catch (error) {
    console.error('Insurance analysis error:', error)
    return NextResponse.json({
      success: false,
      error: error instanceof Error ? error.message : 'Unknown error'
    }, { status: 500 })
  }
}
