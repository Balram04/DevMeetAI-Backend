#!/bin/bash

###############################################################################
# DevMeet Backend - EC2 Automated Setup Script
# Run this script on your EC2 instance after first SSH connection
# Usage: wget https://raw.githubusercontent.com/YOUR_REPO/setup.sh && bash setup.sh
# OR: Save this file and run: bash setup.sh
###############################################################################

set -e  # Exit on any error

echo "========================================"
echo "DevMeet Backend - EC2 Setup Script"
echo "========================================"
echo ""

# Colors for output
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
NC='\033[0m' # No Color

# Function to print colored output
print_success() {
    echo -e "${GREEN}✓ $1${NC}"
}

print_error() {
    echo -e "${RED}✗ $1${NC}"
}

print_info() {
    echo -e "${YELLOW}➜ $1${NC}"
}

# Check if running as ubuntu user
if [ "$USER" != "ubuntu" ]; then
    print_error "Please run this script as ubuntu user"
    exit 1
fi

echo ""
print_info "Step 1: Updating system packages..."
sudo apt update && sudo apt upgrade -y
print_success "System updated"

echo ""
print_info "Step 2: Installing Node.js 20.x..."
curl -fsSL https://deb.nodesource.com/setup_20.x | sudo -E bash -
sudo apt install -y nodejs
NODE_VERSION=$(node --version)
print_success "Node.js installed: $NODE_VERSION"

echo ""
print_info "Step 3: Installing Git..."
sudo apt install -y git
GIT_VERSION=$(git --version)
print_success "Git installed: $GIT_VERSION"

echo ""
print_info "Step 4: Installing PM2 (Process Manager)..."
sudo npm install -g pm2
PM2_VERSION=$(pm2 --version)
print_success "PM2 installed: $PM2_VERSION"

echo ""
print_info "Step 5: Installing Nginx..."
sudo apt install -y nginx
sudo systemctl start nginx
sudo systemctl enable nginx
print_success "Nginx installed and started"

echo ""
print_info "Step 6: Setting up UFW Firewall..."
sudo ufw allow OpenSSH
sudo ufw allow 'Nginx Full'
sudo ufw --force enable
print_success "Firewall configured"

echo ""
print_info "Step 7: Creating application directory..."
cd /home/ubuntu

# Check if DevMeet directory already exists
if [ -d "DevMeet" ]; then
    print_info "DevMeet directory already exists. Skipping clone."
else
    print_info "Please enter your GitHub repository URL (or press Enter to skip):"
    read -r REPO_URL
    
    if [ -n "$REPO_URL" ]; then
        git clone "$REPO_URL" DevMeet
        print_success "Repository cloned"
    else
        print_info "Skipped repository cloning. You can clone manually later."
    fi
fi

echo ""
print_info "Step 8: Installing Certbot for SSL..."
sudo apt install -y certbot python3-certbot-nginx
print_success "Certbot installed"

echo ""
echo "========================================"
print_success "Setup completed successfully!"
echo "========================================"
echo ""
echo "Next Steps:"
echo "1. Clone your repository (if not done):"
echo "   cd /home/ubuntu"
echo "   git clone https://github.com/YOUR_USERNAME/DevMeet.git"
echo ""
echo "2. Navigate to backend directory:"
echo "   cd DevMeet/DevMeet-Backend"
echo ""
echo "3. Install dependencies:"
echo "   npm install --production"
echo ""
echo "4. Create .env file:"
echo "   nano .env"
echo "   (Add all your environment variables)"
echo ""
echo "5. Start with PM2:"
echo "   pm2 start app.js --name devmeet-backend"
echo "   pm2 startup"
echo "   (Run the command it shows)"
echo "   pm2 save"
echo ""
echo "6. Configure Nginx:"
echo "   sudo nano /etc/nginx/sites-available/devmeet-backend"
echo "   (Add Nginx configuration)"
echo ""
echo "7. Enable Nginx config:"
echo "   sudo ln -s /etc/nginx/sites-available/devmeet-backend /etc/nginx/sites-enabled/"
echo "   sudo nginx -t"
echo "   sudo systemctl reload nginx"
echo ""
echo "8. Setup SSL (if using domain):"
echo "   sudo certbot --nginx -d api.devmeet.help"
echo ""
echo "========================================"
echo "Installed Versions:"
echo "  Node.js: $NODE_VERSION"
echo "  npm: $(npm --version)"
echo "  Git: $(git --version | cut -d' ' -f3)"
echo "  PM2: $PM2_VERSION"
echo "  Nginx: $(nginx -v 2>&1 | cut -d'/' -f2)"
echo "========================================"
echo ""
print_success "Server is ready for deployment!"
