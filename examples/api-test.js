#!/usr/bin/env node

/**
 * NeuroDoc API Test Suite
 * 
 * This script demonstrates how to use the NeuroDoc API endpoints
 * Run with: node examples/api-test.js
 */

const fetch = require('node-fetch');
const FormData = require('form-data');
const fs = require('fs');
const path = require('path');

// Configuration
const API_BASE_URL = process.env.API_BASE_URL || 'http://localhost:3000';
const TEST_JWT_TOKEN = process.env.TEST_JWT_TOKEN || 'your_jwt_token_here';

// Test data
const TEST_QUERY = "45-year-old male, diabetes, cardiac surgery in Mumbai, 6-month premium policy";
const SAMPLE_PDF_PATH = path.join(__dirname, 'sample-policy.pdf'); // You need to provide this

// Helper function to make API calls
async function apiCall(endpoint, options = {}) {
  const url = `${API_BASE_URL}${endpoint}`;
  const headers = {
    'Authorization': `Bearer ${TEST_JWT_TOKEN}`,
    ...options.headers
  };

  try {
    const response = await fetch(url, {
      ...options,
      headers
    });

    const data = await response.json();
    
    console.log(`\n--- ${options.method || 'GET'} ${endpoint} ---`);
    console.log(`Status: ${response.status}`);
    console.log('Response:', JSON.stringify(data, null, 2));
    
    return { response, data };
  } catch (error) {
    console.error(`Error calling ${endpoint}:`, error.message);
    return { error };
  }
}

// Test health endpoint
async function testHealth() {
  console.log('\n🔍 Testing Health Check...');
  await apiCall('/api/health?detailed=true');
}

// Test document upload
async function testUpload() {
  console.log('\n📁 Testing Document Upload...');
  
  if (!fs.existsSync(SAMPLE_PDF_PATH)) {
    console.log('⚠️  Sample PDF not found, skipping upload test');
    console.log(`   Create a sample PDF at: ${SAMPLE_PDF_PATH}`);
    return null;
  }

  const formData = new FormData();
  formData.append('file', fs.createReadStream(SAMPLE_PDF_PATH));

  const { data } = await apiCall('/api/upload', {
    method: 'POST',
    body: formData,
    headers: formData.getHeaders()
  });

  return data?.document?.id;
}

// Test document listing
async function testDocuments() {
  console.log('\n📋 Testing Document Listing...');
  await apiCall('/api/documents?limit=10');
}

// Test query processing
async function testQuery() {
  console.log('\n❓ Testing Query Processing...');
  await apiCall('/api/query', {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json'
    },
    body: JSON.stringify({
      query: TEST_QUERY,
      options: {
        limit: 5,
        threshold: 0.7,
        includeReferences: true
      }
    })
  });
}

// Test clauses endpoint
async function testClauses(documentId) {
  if (!documentId) {
    console.log('\n⚠️  No document ID available, skipping clauses test');
    return;
  }
  
  console.log('\n📄 Testing Clauses Retrieval...');
  await apiCall(`/api/clauses?doc_id=${documentId}&limit=5`);
}

// Test audit trail
async function testAudit() {
  console.log('\n📊 Testing Audit Trail...');
  await apiCall('/api/audit?limit=5');
  
  // Test audit statistics
  console.log('\n📈 Testing Audit Statistics...');
  await apiCall('/api/audit', {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json'
    },
    body: JSON.stringify({
      startDate: new Date(Date.now() - 30 * 24 * 60 * 60 * 1000).toISOString(),
      endDate: new Date().toISOString()
    })
  });
}

// Main test runner
async function runTests() {
  console.log('🚀 Starting NeuroDoc API Tests...');
  console.log(`API Base URL: ${API_BASE_URL}`);
  
  if (TEST_JWT_TOKEN === 'your_jwt_token_here') {
    console.log('⚠️  Warning: Using placeholder JWT token. Set TEST_JWT_TOKEN environment variable.');
  }

  try {
    // Run tests in sequence
    await testHealth();
    const documentId = await testUpload();
    await testDocuments();
    await testQuery();
    await testClauses(documentId);
    await testAudit();
    
    console.log('\n✅ All tests completed!');
  } catch (error) {
    console.error('\n❌ Test suite failed:', error.message);
  }
}

// Performance test
async function performanceTest() {
  console.log('\n⚡ Running Performance Test...');
  
  const queries = [
    "30-year-old female, maternity coverage, premium plan",
    "55-year-old male, cancer treatment, Mumbai hospital",
    "Emergency surgery, road accident, 25-year-old",
    "Diabetes medication coverage, 40-year-old patient",
    "Dental procedures covered under family plan"
  ];

  const startTime = Date.now();
  const promises = queries.map((query, index) => 
    apiCall('/api/query', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ query, options: { limit: 3 } })
    }).then(result => ({ index, query, result, time: Date.now() - startTime }))
  );

  const results = await Promise.all(promises);
  const totalTime = Date.now() - startTime;

  console.log(`\n📊 Performance Results:`);
  console.log(`Total time: ${totalTime}ms`);
  console.log(`Average per query: ${totalTime / queries.length}ms`);
  console.log(`Queries per second: ${(queries.length / totalTime * 1000).toFixed(2)}`);
  
  results.forEach(({ index, query, result }) => {
    const status = result.data?.Decision || 'Error';
    console.log(`Query ${index + 1}: ${status} (${query.substring(0, 30)}...)`);
  });
}

// Command line interface
if (require.main === module) {
  const command = process.argv[2];
  
  switch (command) {
    case 'perf':
    case 'performance':
      performanceTest();
      break;
    case 'health':
      testHealth();
      break;
    case 'upload':
      testUpload();
      break;
    case 'query':
      testQuery();
      break;
    default:
      runTests();
  }
}

module.exports = {
  apiCall,
  testHealth,
  testUpload,
  testDocuments,
  testQuery,
  testClauses,
  testAudit,
  performanceTest
};
