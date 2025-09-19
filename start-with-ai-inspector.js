/**
 * Start Main Project with AI Element Inspector
 * Launches both the main server and AI element inspector together
 */

import { spawn } from 'child_process';
import path from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

class ProjectStarter {
    constructor() {
        this.processes = [];
        this.isShuttingDown = false;
    }

    async start() {
        console.log('🚀 Starting Project with AI Element Inspector...\n');

        // Start main server
        console.log('📡 Starting main server...');
        const mainServer = spawn('npm', ['run', 'dev:server'], {
            cwd: __dirname,
            stdio: 'pipe',
            shell: true
        });

        mainServer.stdout.on('data', (data) => {
            console.log(`[MAIN] ${data.toString().trim()}`);
        });

        mainServer.stderr.on('data', (data) => {
            console.error(`[MAIN ERROR] ${data.toString().trim()}`);
        });

        this.processes.push({ name: 'main-server', process: mainServer });

        // Wait a bit for main server to start
        await this.sleep(3000);

        // Start AI Element Inspector
        console.log('🤖 Starting AI Element Inspector...');
        const aiInspector = spawn('node', ['start-integrated-server.js'], {
            cwd: path.join(__dirname, 'ai-element-inspector-js'),
            stdio: 'pipe',
            shell: true
        });

        aiInspector.stdout.on('data', (data) => {
            console.log(`[AI] ${data.toString().trim()}`);
        });

        aiInspector.stderr.on('data', (data) => {
            console.error(`[AI ERROR] ${data.toString().trim()}`);
        });

        this.processes.push({ name: 'ai-inspector', process: aiInspector });

        // Wait for AI inspector to start
        await this.sleep(2000);

        // Start frontend
        console.log('🎨 Starting frontend...');
        const frontend = spawn('npm', ['run', 'dev'], {
            cwd: __dirname,
            stdio: 'pipe',
            shell: true
        });

        frontend.stdout.on('data', (data) => {
            console.log(`[FRONTEND] ${data.toString().trim()}`);
        });

        frontend.stderr.on('data', (data) => {
            console.error(`[FRONTEND ERROR] ${data.toString().trim()}`);
        });

        this.processes.push({ name: 'frontend', process: frontend });

        // Setup graceful shutdown
        this.setupGracefulShutdown();

        console.log('\n✅ All services started successfully!');
        console.log('\n📋 Service URLs:');
        console.log('   Main Server: http://localhost:3001');
        console.log('   AI Inspector: http://localhost:3002');
        console.log('   Frontend: http://localhost:5173');
        console.log('\n🎯 AI Discovery endpoints:');
        console.log('   POST /api/ai/discover-elements - AI-enhanced element discovery');
        console.log('   POST /api/ai/analyze-element - Analyze specific element');
        console.log('   POST /api/ai/heal-element - Heal broken selectors');
        console.log('\nPress Ctrl+C to stop all services\n');
    }

    setupGracefulShutdown() {
        const shutdown = () => {
            if (this.isShuttingDown) return;
            this.isShuttingDown = true;

            console.log('\n🛑 Shutting down all services...');

            this.processes.forEach(({ name, process }) => {
                console.log(`   Stopping ${name}...`);
                process.kill('SIGTERM');
            });

            // Force kill after 5 seconds
            setTimeout(() => {
                this.processes.forEach(({ name, process }) => {
                    if (!process.killed) {
                        console.log(`   Force killing ${name}...`);
                        process.kill('SIGKILL');
                    }
                });
                process.exit(0);
            }, 5000);
        };

        process.on('SIGINT', shutdown);
        process.on('SIGTERM', shutdown);
    }

    sleep(ms) {
        return new Promise(resolve => setTimeout(resolve, ms));
    }
}

// Start the project
const starter = new ProjectStarter();
starter.start().catch(error => {
    console.error('Failed to start project:', error);
    process.exit(1);
});
