import fs from 'fs/promises';
import path from 'path';
import { fileURLToPath } from 'url';
import { execSync } from 'child_process';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const rootDir = path.join(__dirname, '..');

async function build() {
  console.log('🚀 Starting production build...\n');

  try {
    // Clean dist directory
    console.log('🧹 Cleaning dist directory...');
    try {
      await fs.rm(path.join(rootDir, 'dist'), { recursive: true, force: true });
    } catch (error) {
      console.log('⚠️  Could not remove dist directory, continuing anyway...');
    }
    await fs.mkdir(path.join(rootDir, 'dist'), { recursive: true });

    // Build client with Vite
    console.log('📦 Building client with Vite (includes tree shaking)...');
    execSync('npm run build', { 
      cwd: path.join(rootDir, 'client'),
      stdio: 'inherit'
    });

    // Copy client build to dist
    console.log('📋 Copying client build to dist/client...');
    await fs.cp(
      path.join(rootDir, 'client/dist'),
      path.join(rootDir, 'dist/client'),
      { recursive: true }
    );

    // Clean up temporary client/dist folder
    console.log('🧹 Cleaning up temporary client/dist folder...');
    await fs.rm(path.join(rootDir, 'client/dist'), { recursive: true, force: true });

    // Copy server files to dist
    console.log('📋 Copying server files to dist/server...');
    await fs.cp(
      path.join(rootDir, 'server'),
      path.join(rootDir, 'dist/server'),
      { recursive: true }
    );

    // Create production package.json
    console.log('📝 Creating production package.json...');
    const originalPackageJson = JSON.parse(
      await fs.readFile(path.join(rootDir, 'package.json'), 'utf-8')
    );

    const productionPackageJson = {
      name: originalPackageJson.name,
      version: originalPackageJson.version,
      description: originalPackageJson.description,
      type: "module",
      main: "server/index.js",
      scripts: {
        start: "node server/index.js"
      },
      dependencies: originalPackageJson.dependencies
    };

    await fs.writeFile(
      path.join(rootDir, 'dist/package.json'),
      JSON.stringify(productionPackageJson, null, 2)
    );

    // Copy .env file to dist directory (excluding development-only variables)
    console.log('📋 Creating production .env file...');
    const envContent = await fs.readFile(path.join(rootDir, '.env'), 'utf-8');
    
    // Development-only variables to exclude from production
    const devOnlyVars = ['CLIENT_PORT'];
    
    const productionEnvLines = envContent
      .split('\n')
      .filter(line => {
        // Keep comments and empty lines
        if (line.trim().startsWith('#') || line.trim() === '') {
          return true;
        }
        
        // Check if this line defines a dev-only variable
        const varName = line.split('=')[0];
        return !devOnlyVars.includes(varName);
      });
    
    await fs.writeFile(
      path.join(rootDir, 'dist/.env'),
      productionEnvLines.join('\n')
    );

    console.log('\n✅ Build complete! Production files are in the dist/ directory.');
    console.log('\nTo run in production:');
    console.log('  cd dist');
    console.log('  npm install --omit=dev');
    console.log('  npm start');

  } catch (error) {
    console.error('❌ Build failed:', error);
    process.exit(1);
  }
}

build();