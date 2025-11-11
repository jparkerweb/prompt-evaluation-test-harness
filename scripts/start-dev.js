import 'dotenv/config';
import { spawn } from 'child_process';
import killPort from 'kill-port';
import net from 'net';

const PORT = process.env.PORT || 4444;
const CLIENT_PORT = process.env.CLIENT_PORT || 5173;

// Function to check if a port is actually free
function isPortFree(port) {
  return new Promise((resolve) => {
    const server = net.createServer();
    server.listen(port, () => {
      server.once('close', () => resolve(true));
      server.close();
    });
    server.on('error', () => resolve(false));
  });
}

// Function to kill port with retry and verification
async function killPortSafely(port, maxRetries = 3) {
  console.log(`Attempting to free port ${port}...`);
  
  for (let i = 0; i < maxRetries; i++) {
    try {
      // First check if port is already free
      if (await isPortFree(port)) {
        console.log(`✅ Port ${port} is already free`);
        return true;
      }
      
      // Kill the port
      await killPort(port);
      console.log(`🔄 Kill command sent for port ${port}`);
      
      // Wait a bit for the process to actually die
      await new Promise(resolve => setTimeout(resolve, 1000));
      
      // Verify the port is now free
      if (await isPortFree(port)) {
        console.log(`✅ Port ${port} successfully freed`);
        return true;
      }
      
      console.log(`⚠️  Port ${port} still in use, retrying... (${i + 1}/${maxRetries})`);
    } catch (error) {
      console.log(`⚠️  Error killing port ${port}: ${error.message}`);
      if (await isPortFree(port)) {
        console.log(`✅ Port ${port} is free despite error`);
        return true;
      }
    }
  }
  
  // Final check
  const isFree = await isPortFree(port);
  if (!isFree) {
    console.error(`❌ Failed to free port ${port} after ${maxRetries} attempts`);
    return false;
  }
  
  console.log(`✅ Port ${port} is now free`);
  return true;
}

async function startServers() {
  console.log(`🚀 Preparing to start development servers...`);
  console.log(`   Backend:  http://localhost:${PORT}`);
  console.log(`   Frontend: http://localhost:${CLIENT_PORT}`);
  console.log();
  
  // Kill ports safely with verification
  const serverPortFree = await killPortSafely(PORT);
  const clientPortFree = await killPortSafely(CLIENT_PORT);
  
  if (!serverPortFree || !clientPortFree) {
    console.error('❌ Could not free required ports. Exiting.');
    process.exit(1);
  }
  
  console.log();
  console.log('🎉 All ports freed successfully! Starting servers...');
  console.log();
  
  // Start both servers
  const servers = spawn('npx', ['concurrently', 
    '"nodemon server/index.js"', 
    '"cd client && npm run dev"'
  ], {
    shell: true,
    stdio: 'inherit'
  });
  
  servers.on('error', (err) => {
    console.error('❌ Failed to start servers:', err);
  });
  
  // Handle graceful shutdown
  process.on('SIGINT', async () => {
    console.log('\n🛑 Shutting down servers...');
    servers.kill('SIGINT');
    await killPortSafely(PORT);
    await killPortSafely(CLIENT_PORT);
    process.exit(0);
  });
}

startServers().catch(console.error);