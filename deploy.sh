#!/bin/bash

# NeuroDoc System Deployment Script
# This script helps set up and deploy the NeuroDoc system

set -e

echo "🚀 NeuroDoc System Deployment Script"
echo "====================================="

# Colors for output
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
NC='\033[0m' # No Color

# Function to print colored output
print_status() {
    echo -e "${GREEN}[INFO]${NC} $1"
}

print_warning() {
    echo -e "${YELLOW}[WARNING]${NC} $1"
}

print_error() {
    echo -e "${RED}[ERROR]${NC} $1"
}

print_step() {
    echo -e "${BLUE}[STEP]${NC} $1"
}

# Check if required tools are installed
check_requirements() {
    print_step "Checking requirements..."
    
    local missing_tools=()
    
    if ! command -v node &> /dev/null; then
        missing_tools+=("node")
    fi
    
    if ! command -v npm &> /dev/null; then
        missing_tools+=("npm")
    fi
    
    if ! command -v docker &> /dev/null; then
        missing_tools+=("docker")
    fi
    
    if ! command -v docker-compose &> /dev/null; then
        missing_tools+=("docker-compose")
    fi
    
    if [ ${#missing_tools[@]} -ne 0 ]; then
        print_error "Missing required tools: ${missing_tools[*]}"
        print_status "Please install the missing tools and run this script again."
        exit 1
    fi
    
    print_status "All required tools are installed."
}

# Setup environment variables
setup_environment() {
    print_step "Setting up environment variables..."
    
    if [ ! -f .env.local ]; then
        print_warning ".env.local not found. Please create it with your configuration."
        print_status "Template .env.local has been created. Please fill in your values."
        return 1
    fi
    
    # Validate critical environment variables
    source .env.local
    
    local missing_vars=()
    
    if [ -z "$NEXT_PUBLIC_SUPABASE_URL" ]; then
        missing_vars+=("NEXT_PUBLIC_SUPABASE_URL")
    fi
    
    if [ -z "$NEXT_PUBLIC_SUPABASE_ANON_KEY" ]; then
        missing_vars+=("NEXT_PUBLIC_SUPABASE_ANON_KEY")
    fi
    
    if [ -z "$SUPABASE_SERVICE_ROLE_KEY" ]; then
        missing_vars+=("SUPABASE_SERVICE_ROLE_KEY")
    fi
    
    if [ -z "$OPENAI_API_KEY" ]; then
        missing_vars+=("OPENAI_API_KEY")
    fi
    
    if [ ${#missing_vars[@]} -ne 0 ]; then
        print_error "Missing required environment variables: ${missing_vars[*]}"
        return 1
    fi
    
    print_status "Environment variables configured."
    return 0
}

# Install dependencies
install_dependencies() {
    print_step "Installing dependencies..."
    
    if [ -f pnpm-lock.yaml ]; then
        if ! command -v pnpm &> /dev/null; then
            print_status "Installing pnpm..."
            npm install -g pnpm
        fi
        pnpm install --frozen-lockfile
    else
        npm install --legacy-peer-deps
    fi
    
    print_status "Dependencies installed successfully."
}

# Setup database
setup_database() {
    print_step "Setting up database..."
    
    print_status "Please run the SQL schema in database/schema.sql in your Supabase SQL Editor."
    print_status "This includes:"
    print_status "  - Creating tables (documents, clauses, queries, audit_log)"
    print_status "  - Enabling pgvector extension"
    print_status "  - Setting up Row Level Security policies"
    print_status "  - Creating vector search functions"
    print_status "  - Creating storage bucket"
    
    read -p "Have you set up the database? (y/n): " -n 1 -r
    echo
    if [[ ! $REPLY =~ ^[Yy]$ ]]; then
        print_warning "Please set up the database first."
        return 1
    fi
    
    print_status "Database setup confirmed."
    return 0
}

# Build application
build_application() {
    print_step "Building application..."
    
    if [ -f pnpm-lock.yaml ]; then
        pnpm run build
    else
        npm run build
    fi
    
    print_status "Application built successfully."
}

# Development setup
dev_setup() {
    print_status "Setting up development environment..."
    
    check_requirements
    
    if ! setup_environment; then
        exit 1
    fi
    
    install_dependencies
    
    if ! setup_database; then
        exit 1
    fi
    
    print_status "Development setup complete!"
    print_status "Run 'npm run dev' to start the development server."
}

# Production deployment with Docker
prod_deploy() {
    print_status "Setting up production deployment..."
    
    check_requirements
    
    if ! setup_environment; then
        exit 1
    fi
    
    if ! setup_database; then
        exit 1
    fi
    
    print_step "Building Docker images..."
    docker-compose build
    
    print_step "Starting services..."
    docker-compose up -d
    
    print_step "Waiting for services to start..."
    sleep 10
    
    # Health check
    print_step "Performing health check..."
    local retries=5
    local count=0
    
    while [ $count -lt $retries ]; do
        if curl -f http://localhost:3000/api/health > /dev/null 2>&1; then
            print_status "Health check passed!"
            break
        else
            count=$((count + 1))
            print_warning "Health check failed. Retrying ($count/$retries)..."
            sleep 5
        fi
    done
    
    if [ $count -eq $retries ]; then
        print_error "Health check failed after $retries attempts."
        docker-compose logs neurodoc-app
        exit 1
    fi
    
    print_status "Production deployment complete!"
    print_status "Application is running at: http://localhost:3000"
    print_status "API Health: http://localhost:3000/api/health"
}

# Test the API
test_api() {
    print_step "Testing API endpoints..."
    
    if ! curl -f http://localhost:3000/api/health > /dev/null 2>&1; then
        print_error "API is not responding. Please check if the application is running."
        exit 1
    fi
    
    print_status "Running comprehensive API tests..."
    
    if [ -f examples/api-test.js ]; then
        node examples/api-test.js
    else
        print_warning "API test script not found. Skipping tests."
    fi
    
    print_status "API tests completed."
}

# Show logs
show_logs() {
    print_step "Showing application logs..."
    docker-compose logs -f neurodoc-app
}

# Stop services
stop_services() {
    print_step "Stopping services..."
    docker-compose down
    print_status "Services stopped."
}

# Show help
show_help() {
    echo "Usage: $0 [COMMAND]"
    echo ""
    echo "Commands:"
    echo "  dev       Set up development environment"
    echo "  prod      Deploy production environment with Docker"
    echo "  test      Test API endpoints"
    echo "  logs      Show application logs"
    echo "  stop      Stop all services"
    echo "  help      Show this help message"
    echo ""
    echo "Examples:"
    echo "  $0 dev        # Set up for development"
    echo "  $0 prod       # Deploy for production"
    echo "  $0 test       # Test the API"
    echo ""
}

# Main script logic
case "${1:-help}" in
    "dev")
        dev_setup
        ;;
    "prod")
        prod_deploy
        ;;
    "test")
        test_api
        ;;
    "logs")
        show_logs
        ;;
    "stop")
        stop_services
        ;;
    "help"|"--help"|"-h")
        show_help
        ;;
    *)
        print_error "Unknown command: $1"
        show_help
        exit 1
        ;;
esac
