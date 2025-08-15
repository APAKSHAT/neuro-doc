#!/usr/bin/env python3
"""
NeuroDoc Python Client Example

This script demonstrates how to integrate with NeuroDoc API using Python.
Install dependencies: pip install requests python-dotenv
"""

import os
import json
import time
import requests
from typing import Dict, List, Optional, Any
from dataclasses import dataclass
from pathlib import Path

# Load environment variables
try:
    from dotenv import load_dotenv
    load_dotenv()
except ImportError:
    print("Install python-dotenv for environment variable loading")

@dataclass
class NeuroDocConfig:
    base_url: str = os.getenv('NEURODOC_API_URL', 'http://localhost:3000')
    jwt_token: str = os.getenv('NEURODOC_JWT_TOKEN', '')
    timeout: int = 30

class NeuroDocClient:
    """Python client for NeuroDoc API"""
    
    def __init__(self, config: NeuroDocConfig):
        self.config = config
        self.session = requests.Session()
        self.session.headers.update({
            'Authorization': f'Bearer {config.jwt_token}',
            'User-Agent': 'NeuroDoc-Python-Client/1.0'
        })
    
    def _request(self, method: str, endpoint: str, **kwargs) -> Dict[str, Any]:
        """Make HTTP request to API"""
        url = f"{self.config.base_url}{endpoint}"
        
        try:
            response = self.session.request(
                method, url, timeout=self.config.timeout, **kwargs
            )
            response.raise_for_status()
            return response.json()
        except requests.exceptions.RequestException as e:
            print(f"API request failed: {e}")
            if hasattr(e, 'response') and e.response is not None:
                try:
                    error_data = e.response.json()
                    print(f"Error details: {error_data}")
                except:
                    print(f"Response text: {e.response.text}")
            raise
    
    def health_check(self, detailed: bool = False) -> Dict[str, Any]:
        """Check API health status"""
        params = {'detailed': 'true'} if detailed else {}
        return self._request('GET', '/api/health', params=params)
    
    def upload_document(self, file_path: str) -> Dict[str, Any]:
        """Upload a document for processing"""
        if not os.path.exists(file_path):
            raise FileNotFoundError(f"File not found: {file_path}")
        
        with open(file_path, 'rb') as f:
            files = {'file': (os.path.basename(file_path), f)}
            # Remove auth header for multipart upload (will be re-added)
            headers = {'Authorization': f'Bearer {self.config.jwt_token}'}
            
            response = requests.post(
                f"{self.config.base_url}/api/upload",
                files=files,
                headers=headers,
                timeout=self.config.timeout
            )
            response.raise_for_status()
            return response.json()
    
    def query_documents(self, query: str, options: Optional[Dict] = None) -> Dict[str, Any]:
        """Query documents for decision making"""
        data = {
            'query': query,
            'options': options or {
                'limit': 5,
                'threshold': 0.7,
                'includeReferences': True
            }
        }
        return self._request('POST', '/api/query', json=data)
    
    def list_documents(self, limit: int = 50, offset: int = 0, 
                      search: Optional[str] = None, file_type: Optional[str] = None) -> Dict[str, Any]:
        """List user's documents"""
        params = {'limit': limit, 'offset': offset}
        if search:
            params['search'] = search
        if file_type:
            params['fileType'] = file_type
        
        return self._request('GET', '/api/documents', params=params)
    
    def get_clauses(self, document_id: str, limit: int = 50, 
                   include_embeddings: bool = False) -> Dict[str, Any]:
        """Get clauses from a specific document"""
        params = {
            'doc_id': document_id,
            'limit': limit,
            'include_embeddings': str(include_embeddings).lower()
        }
        return self._request('GET', '/api/clauses', params=params)
    
    def get_audit_trail(self, limit: int = 20, start_date: Optional[str] = None,
                       end_date: Optional[str] = None) -> Dict[str, Any]:
        """Get audit trail of queries and decisions"""
        params = {'limit': limit}
        if start_date:
            params['start_date'] = start_date
        if end_date:
            params['end_date'] = end_date
        
        return self._request('GET', '/api/audit', params=params)
    
    def get_audit_statistics(self, start_date: Optional[str] = None,
                           end_date: Optional[str] = None) -> Dict[str, Any]:
        """Get audit statistics"""
        from datetime import datetime, timedelta
        
        if not start_date:
            start_date = (datetime.now() - timedelta(days=30)).isoformat()
        if not end_date:
            end_date = datetime.now().isoformat()
        
        data = {
            'startDate': start_date,
            'endDate': end_date
        }
        return self._request('POST', '/api/audit', json=data)

class NeuroDocWorkflow:
    """High-level workflow examples"""
    
    def __init__(self, client: NeuroDocClient):
        self.client = client
    
    def process_document_and_query(self, file_path: str, query: str) -> Dict[str, Any]:
        """Complete workflow: upload document and query it"""
        print(f"🔄 Processing workflow for: {os.path.basename(file_path)}")
        
        # Upload document
        print("📁 Uploading document...")
        upload_result = self.client.upload_document(file_path)
        document_id = upload_result['document']['id']
        print(f"✅ Document uploaded: {document_id}")
        
        # Wait a moment for processing
        time.sleep(2)
        
        # Query the document
        print(f"❓ Querying: {query}")
        query_result = self.client.query_documents(query)
        print(f"✅ Decision: {query_result.get('Decision', 'Unknown')}")
        
        return {
            'upload': upload_result,
            'query': query_result,
            'document_id': document_id
        }
    
    def batch_queries(self, queries: List[str]) -> List[Dict[str, Any]]:
        """Process multiple queries"""
        results = []
        
        for i, query in enumerate(queries, 1):
            print(f"🔍 Processing query {i}/{len(queries)}: {query[:50]}...")
            try:
                result = self.client.query_documents(query)
                results.append({
                    'query': query,
                    'decision': result.get('Decision'),
                    'confidence': result.get('ConfidenceScore'),
                    'success': True
                })
            except Exception as e:
                results.append({
                    'query': query,
                    'error': str(e),
                    'success': False
                })
        
        return results
    
    def analyze_performance(self, queries: List[str]) -> Dict[str, Any]:
        """Analyze query performance"""
        start_time = time.time()
        results = []
        
        for query in queries:
            query_start = time.time()
            try:
                result = self.client.query_documents(query)
                query_time = time.time() - query_start
                
                results.append({
                    'query': query,
                    'decision': result.get('Decision'),
                    'confidence': result.get('ConfidenceScore', 0),
                    'response_time': query_time,
                    'success': True
                })
            except Exception as e:
                query_time = time.time() - query_start
                results.append({
                    'query': query,
                    'error': str(e),
                    'response_time': query_time,
                    'success': False
                })
        
        total_time = time.time() - start_time
        successful_queries = [r for r in results if r['success']]
        
        return {
            'total_queries': len(queries),
            'successful_queries': len(successful_queries),
            'total_time': total_time,
            'average_time': total_time / len(queries),
            'success_rate': len(successful_queries) / len(queries),
            'average_confidence': sum(r['confidence'] for r in successful_queries) / len(successful_queries) if successful_queries else 0,
            'results': results
        }

def main():
    """Example usage"""
    # Configuration
    config = NeuroDocConfig()
    
    if not config.jwt_token:
        print("⚠️  Warning: No JWT token provided. Set NEURODOC_JWT_TOKEN environment variable.")
        config.jwt_token = input("Enter JWT token: ").strip()
    
    # Initialize client
    client = NeuroDocClient(config)
    workflow = NeuroDocWorkflow(client)
    
    try:
        # Health check
        print("🔍 Checking API health...")
        health = client.health_check(detailed=True)
        print(f"✅ API Status: {health['status']}")
        
        # List existing documents
        print("\n📋 Listing documents...")
        docs = client.list_documents(limit=5)
        print(f"Found {len(docs.get('documents', []))} documents")
        
        # Example queries
        sample_queries = [
            "45-year-old male, diabetes, cardiac surgery in Mumbai",
            "Maternity coverage for 28-year-old woman, premium plan",
            "Emergency dental treatment, 35-year-old, family plan",
            "Cancer treatment coverage, 50-year-old patient",
            "Physiotherapy sessions after knee surgery"
        ]
        
        print("\n❓ Running sample queries...")
        batch_results = workflow.batch_queries(sample_queries[:3])  # Limit for demo
        
        for result in batch_results:
            if result['success']:
                print(f"   Query: {result['query'][:40]}...")
                print(f"   Decision: {result['decision']} (Confidence: {result['confidence']:.2f})")
            else:
                print(f"   Query failed: {result['error']}")
        
        # Get audit statistics
        print("\n📊 Getting audit statistics...")
        stats = client.get_audit_statistics()
        print(f"Total queries: {stats['statistics']['totalQueries']}")
        print(f"Average confidence: {stats['statistics']['averageConfidence']}")
        
        print("\n✅ Demo completed successfully!")
        
    except Exception as e:
        print(f"\n❌ Demo failed: {e}")

if __name__ == "__main__":
    main()
