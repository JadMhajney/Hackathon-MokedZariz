async function testAIModules() {
    console.log('=== Testing AI Modules ===');
    
    // Test OpenAI connection
    try {
        console.log('Testing OpenAI message module...');
        const { sendMessage } = await import('./message.mjs');
        
        const testResponse = await sendMessage('Hello, respond with just "OK" if you can hear me');
        console.log('✓ OpenAI Response:', testResponse);
        
        // Test severity scoring
        const severityTest = await sendMessage('Rate the severity of this emergency from 1-10 (1=most severe, 10=least severe). Respond with only a number: "Heart attack"');
        console.log('✓ Severity test:', severityTest);
        
    } catch (error) {
        console.error('✗ OpenAI Error:', error.message);
    }
    
    // Test audio transcription (if you have a test file)
    try {
        console.log('Testing audio transcription...');
        const { read_audio } = await import('./auido.mjs');
        
        // You would need to put a test audio file in your uploads/audio folder
        // const testAudio = await read_audio('uploads/audio/test.wav');
        // console.log('✓ Audio transcription:', testAudio);
        console.log('ℹ️ Audio test skipped - add a test audio file to test this');
        
    } catch (error) {
        console.error('✗ Audio transcription error:', error.message);
    }
    
    console.log('=== AI Module Test Complete ===');
}

// Run the test
testAIModules();