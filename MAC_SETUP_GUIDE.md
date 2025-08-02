# NodeGuard AI Security Platform - Mac Mini M2 Setup Guide

## 🍎 Mac Mini M2 Specific Installation

This guide is optimized for Mac Mini M2 (Apple Silicon) systems.

## Prerequisites Check

First, let's verify your system meets the requirements:

```bash
# Check your Mac model and chip
system_profiler SPHardwareDataType | grep "Model\|Chip"

# Check macOS version (should be 12.0+ for best compatibility)
sw_vers
```

## Step 1: Install Required Tools

### Install Homebrew (if not already installed)
```bash
/bin/bash -c "$(curl -fsSL https://raw.githubusercontent.com/Homebrew/install/HEAD/install.sh)"
```

### Install Node.js (LTS version for M2 compatibility)
```bash
# Install Node.js 18 LTS (optimized for Apple Silicon)
brew install node@18

# Verify installation
node --version  # Should show v18.x.x
npm --version   # Should show 9.x.x or higher
```

### Install Python 3.9+ (if not already installed)
```bash
# Install Python 3.11 (recommended for M2)
brew install python@3.11

# Create symlink for python3 command
brew link python@3.11

# Verify installation
python3 --version  # Should show 3.11.x
pip3 --version     # Should be available
```

### Install Additional Tools
```bash
# Install curl (usually pre-installed)
brew install curl

# Install git (usually pre-installed)
brew install git

# Optional: Install lsof for port checking
brew install lsof
```

## Step 2: Get OpenRouter API Key

1. Visit [OpenRouter.ai](https://openrouter.ai/)
2. Sign up for an account
3. Navigate to API Keys section
4. Create a new API key
5. Copy the key (you'll need it in Step 4)

## Step 3: Clone and Setup Project

```bash
# Navigate to your projects directory
cd ~/projects  # or wherever you want to install

# If you haven't cloned yet:
git clone https://github.com/eakarsu/security_detection.git
cd security_detection

# If already cloned, just navigate:
cd security_detection
```

## Step 4: Run Installation Script

```bash
# Make sure scripts are executable
chmod +x install.sh start.sh

# Run the installation script
./install.sh
```

The installation script will:
- ✅ Check all system requirements
- ✅ Create Python virtual environment
- ✅ Install Python dependencies (optimized for M2)
- ✅ Install Node.js dependencies
- ✅ Create necessary directories
- ✅ Set up environment configuration

## Step 5: Configure Environment

```bash
# Edit the .env file to add your OpenRouter API key
nano .env

# Or use your preferred editor:
code .env  # VS Code
vim .env   # Vim
```

**Required configuration:**
```bash
OPENROUTER_API_KEY=your_actual_api_key_here
DEFAULT_MODEL=anthropic/claude-3.5-sonnet
FALLBACK_MODEL=openai/gpt-4-turbo
```

## Step 6: Start the Platform

```bash
# Start all services
./start.sh
```

The startup script will:
- 🔍 Check all runtime requirements
- 🐍 Start Python ML API (port 8000)
- ⚛️ Start React frontend (port 3000)
- 🧪 Test all services
- 🤖 Test AI functionality

## Step 7: Access the Platform

Once started, you can access:

- **Frontend**: http://localhost:3000
- **Python API**: http://localhost:8000
- **API Documentation**: http://localhost:8000/docs

## Mac M2 Specific Notes

### Performance Optimizations
- The Python virtual environment uses native ARM64 packages
- Node.js dependencies are compiled for Apple Silicon
- All services run natively on M2 architecture

### Memory Usage
- Python ML API: ~200-400MB RAM
- React Frontend: ~100-200MB RAM
- Node.js processes: ~50-100MB RAM each
- Total: ~500MB-1GB RAM usage

### Common M2 Issues and Solutions

#### Issue: Python packages fail to install
```bash
# Solution: Use Rosetta 2 for problematic packages
arch -x86_64 pip3 install package_name
```

#### Issue: Node.js native modules compilation errors
```bash
# Solution: Clear cache and reinstall
cd frontend
rm -rf node_modules package-lock.json
npm cache clean --force
npm install
```

#### Issue: Port conflicts
```bash
# Check what's using ports
lsof -i :3000
lsof -i :8000

# Kill processes if needed
sudo kill -9 <PID>
```

## Development Workflow

### Starting Development
```bash
# Start all services
./start.sh

# Or start individually:
# Terminal 1: Python API
cd backend/python && source venv/bin/activate && uvicorn main:app --reload --port 8000

# Terminal 2: Frontend
cd frontend && npm start
```

### Stopping Services
```bash
# Press Ctrl+C in the terminal running ./start.sh
# Or kill individual processes:
pkill -f "uvicorn main:app"
pkill -f "npm start"
```

### Monitoring
```bash
# Check service status
curl http://localhost:8000/health
curl http://localhost:3000

# View logs
tail -f logs/python-api.log
tail -f logs/frontend.log
```

## Testing the Installation

### 1. Test Python ML API
```bash
curl -X POST http://localhost:8000/predict \
  -H "Content-Type: application/json" \
  -d '{
    "event_id": "test-001",
    "timestamp": "2025-01-01T12:00:00Z",
    "source_ip": "192.168.1.100",
    "event_type": "test_event"
  }'
```

### 2. Test AI Analysis
```bash
curl -X POST http://localhost:8000/analyze \
  -H "Content-Type: application/json" \
  -d '{
    "event_id": "test-002",
    "event_data": {
      "timestamp": "2025-01-01T12:00:00Z",
      "source_ip": "192.168.1.100",
      "event_type": "suspicious_login",
      "severity": "high"
    },
    "analysis_type": "comprehensive"
  }'
```

### 3. Test Frontend
1. Open http://localhost:3000 in Safari or Chrome
2. Navigate to "Workflow Builder"
3. Try creating a simple workflow

## Troubleshooting

### Check System Resources
```bash
# Check CPU usage
top -l 1 | grep "CPU usage"

# Check memory usage
vm_stat | perl -ne '/page size of (\d+)/ and $size=$1; /Pages\s+([^:]+):\s+(\d+)/ and printf("%-16s % 16.2f MB\n", "$1:", $2 * $size / 1048576);'

# Check disk space
df -h
```

### Reset Installation
```bash
# Clean everything and start over
rm -rf backend/python/venv
rm -rf frontend/node_modules
rm -rf backend/nodejs/node_modules
rm -rf logs
rm .env

# Run installation again
./install.sh
```

## Next Steps

1. **Explore the Workflow Builder**: Create your first security workflow
2. **Test AI Analysis**: Try different types of security events
3. **Customize Prompts**: Modify AI prompts in `backend/python/utils/prompts.py`
4. **Add Data Sources**: Connect real security data feeds
5. **Deploy to Production**: Use Docker for production deployment

## Support

If you encounter issues:
1. Check the logs in the `logs/` directory
2. Verify all prerequisites are installed correctly
3. Ensure your OpenRouter API key is valid
4. Check the GitHub issues for known problems

Happy security hunting! 🛡️🤖
