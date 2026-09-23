#!/bin/bash

# NANDI Single EC2 Deployment Script
# Run this script on your EC2 instance inside the project root folder.

echo "=========================================="
echo "    NANDI Automated EC2 Deployment"
echo "=========================================="

# 1. Check if Docker and Docker Compose are installed
if ! command -v docker &> /dev/null; then
    echo "[!] Docker not found. Installing Docker..."
    sudo apt-get update
    sudo apt-get install -y docker.io docker-compose
    sudo systemctl enable docker
    sudo systemctl start docker
    sudo usermod -aG docker ubuntu
    echo "[!] Docker installed. You might need to log out and log back in for group changes to take effect."
fi

# 2. Add Swap Space (Crucial for t2.micro Free Tier to prevent Out Of Memory crashes)
echo "Checking Swap Space..."
if [ $(free | grep -i swap | awk '{print $2}') -eq 0 ]; then
    echo "[!] No swap found. Creating 2GB swap file for Free Tier safety..."
    sudo fallocate -l 2G /swapfile
    sudo chmod 600 /swapfile
    sudo mkswap /swapfile
    sudo swapon /swapfile
    echo '/swapfile none swap sw 0 0' | sudo tee -a /etc/fstab
    echo "[!] Swap space created successfully."
else
    echo "[+] Swap space already exists."
fi

# 3. Fetch the Public IP of the EC2 instance automatically
echo "Fetching EC2 Public IP..."
EC2_PUBLIC_IP=$(curl -s http://checkip.amazonaws.com)

if [ -z "$EC2_PUBLIC_IP" ]; then
    echo "[X] Failed to fetch Public IP. Ensure this is running on an AWS EC2 instance."
    exit 1
fi

echo "Detected Public IP: $EC2_PUBLIC_IP"

# 3. Generate the root .env file for docker-compose
echo "Generating .env file for Docker Compose..."
cat <<EOF > .env
EC2_PUBLIC_IP=${EC2_PUBLIC_IP}
# Add your YouTube or Google Drive video link below after deployment!
# DEMO_VIDEO_URL=https://youtu.be/your_video_id
EOF

# 4. Spin up the containers
echo "Building and starting Docker containers..."
sudo docker-compose up -d --build

echo "=========================================="
echo " Deployment Started Successfully! "
echo "=========================================="
echo ""
echo "You can access your services at:"
echo " - Frontend: http://${EC2_PUBLIC_IP}"
echo " - Backend API: http://${EC2_PUBLIC_IP}:5000"
echo " - AI Service: http://${EC2_PUBLIC_IP}:8000"
echo " - APK Download: http://${EC2_PUBLIC_IP}:5000/nandi.apk"
echo ""
echo "To view logs, run: sudo docker-compose logs -f"
