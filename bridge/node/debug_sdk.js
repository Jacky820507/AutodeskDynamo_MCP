try {
    const server = require('@modelcontextprotocol/sdk/server');
    console.log('✅ Resolved @modelcontextprotocol/sdk/server');
    const stdio = require('@modelcontextprotocol/sdk/server/stdio');
    console.log('✅ Resolved @modelcontextprotocol/sdk/server/stdio');
} catch (e) {
    console.error('❌ Failed to resolve SDK components');
    console.error(e.message);
}

const fs = require('fs');
const path = require('path');
const sdkPath = path.join(__dirname, 'node_modules', '@modelcontextprotocol', 'sdk');
if (fs.existsSync(sdkPath)) {
    console.log('SDK path exists:', sdkPath);
    console.log('Contents:', fs.readdirSync(sdkPath));
    const distPath = path.join(sdkPath, 'dist');
    if (fs.existsSync(distPath)) {
        console.log('✅ dist exists');
    } else {
        console.log('❌ dist MISSING');
    }
} else {
    console.log('❌ SDK path does not exist');
}
