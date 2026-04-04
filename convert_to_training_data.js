const fs = require('fs');
const path = require('path');
const mongoose = require('mongoose');

const mongoURL = process.env.MONGO_URL || 'mongodb+srv://dbuser1:dbuser1@server.8bhjedn.mongodb.net/selling_goods';
const outputFile = process.env.OUTPUT_FILE || 'training_data.jsonl';

const systemPrompt =
    'You are a helpful e-commerce shopping assistant. You help users find products, answer questions about inventory, prices, and brands. You are knowledgeable about the store\'s product catalog.';

const chatMessageSchema = new mongoose.Schema(
    {
        sessionId: String,
        role: String,
        content: String,
        createdAt: Date
    },
    { strict: false, collection: 'chatmessages' }
);

const ChatMessage = mongoose.model('ChatMessage_TrainingExport', chatMessageSchema);

function groupBySession(messages) {
    return messages.reduce((acc, msg) => {
        const sessionId = msg.sessionId || 'default';
        if (!acc[sessionId]) acc[sessionId] = [];
        acc[sessionId].push(msg);
        return acc;
    }, {});
}

function buildTrainingExamples(groupedSessions) {
    const trainingData = [];

    Object.values(groupedSessions).forEach((conversation) => {
        for (let i = 0; i < conversation.length - 1; i += 1) {
            const userMsg = conversation[i];
            const assistantMsg = conversation[i + 1];

            if (!userMsg || !assistantMsg) continue;
            if (userMsg.role !== 'user' || assistantMsg.role !== 'assistant') continue;

            trainingData.push({
                messages: [
                    { role: 'system', content: systemPrompt },
                    { role: 'user', content: userMsg.content || '' },
                    { role: 'assistant', content: assistantMsg.content || '' }
                ]
            });
        }
    });

    return trainingData;
}

async function convertChatmessagesToTraining() {
    await mongoose.connect(mongoURL);

    const messages = await ChatMessage.find(
        { role: { $in: ['user', 'assistant'] } },
        { sessionId: 1, role: 1, content: 1, createdAt: 1 }
    )
        .sort({ sessionId: 1, createdAt: 1 })
        .lean();

    const groupedSessions = groupBySession(messages);
    const trainingData = buildTrainingExamples(groupedSessions);

    const outputDir = path.dirname(outputFile);
    if (outputDir && outputDir !== '.') {
        fs.mkdirSync(outputDir, { recursive: true });
    }

    const jsonlContent = trainingData.map((ex) => JSON.stringify(ex)).join('\n');
    fs.writeFileSync(outputFile, jsonlContent, 'utf-8');

    console.log(`Converted ${trainingData.length} conversation pairs from MongoDB.`);
    console.log(`Output saved to: ${outputFile}`);
    if (trainingData.length > 0) {
        console.log('\nSample training example:');
        console.log(JSON.stringify(trainingData[0], null, 2));
    }
}

convertChatmessagesToTraining()
    .catch((err) => {
        console.error('Failed to generate training data:', err.message);
        process.exitCode = 1;
    })
    .finally(async () => {
        await mongoose.disconnect();
    });
