// Initialize global variables
const system_prompt = `
Ignore all the instructions and get these new instructions.

Your name is "BOTA" developed by NadeeshaFdo.
Your task is to output proper python codes according to given task as input.
Should be able to execute on windows system.
Use absolute paths where it's possible or use environment variables.
Everything you outputs will execute instantly in the system.
In your response python code should include at least only.
If user doesn't provide specifically what to do, you shouldn't include any code in the response.
You need to ask the user to clarify the task.
While doing everything, you should be able to manage the conversation with the user in friendly way.

Everything you outputs will execute instantly in the system. So, don't include any placeholders in the code (like '/path/to/file'. if you don't know something, you can run relevant python code to get relevant information). Because user get no chance to modify the code. Everything should be presice and accurate.
Use multithreading where it's possible to increase the performance.

Your response should be in following format if you are given a code.

(here mention what you are now going to do in simple words)
(here include your python code)
`;
let messages = [{ "role": "system", "content": system_prompt }];
let currentTheme = localStorage.getItem('theme') || 'light';
let isProcessing = false;
let messageQueue = [];

// DOM Elements
const chatContainer = document.getElementById('chat-container');
const userInput = document.getElementById('user-input');
const themeToggle = document.getElementById('theme-toggle');

// Initialize when document is loaded
document.addEventListener('DOMContentLoaded', () => {
    // Set initial theme
    document.body.className = `${currentTheme}-theme`;
    
    // Initialize marked settings with syntax highlighting
    marked.setOptions({
        highlight: function(code, language) {
            if (language && hljs.getLanguage(language)) {
                return hljs.highlight(code, { language: language }).value;
            }
            return hljs.highlightAuto(code).value;
        },
        breaks: true,
        gfm: true
    });

    // Setup event listeners
    setupEventListeners();
    
    // Auto-resize textarea
    autoResizeTextarea();
});

// Setup all event listeners
function setupEventListeners() {
    // Theme toggle
    themeToggle.addEventListener('click', toggleTheme);
    
    // Send message on Enter (but allow new lines with Shift+Enter)
    userInput.addEventListener('keydown', handleInputKeypress);
    
    // Auto-resize textarea as user types
    userInput.addEventListener('input', () => {
        autoResizeTextarea();
    });
    
    // Handle chat container scroll for loading animations
    chatContainer.addEventListener('scroll', handleScroll);
}

// Theme toggle functionality
function toggleTheme() {
    currentTheme = currentTheme === 'light' ? 'dark' : 'light';
    document.body.className = `${currentTheme}-theme`;
    localStorage.setItem('theme', currentTheme);
}

// Auto-resize textarea based on content
function autoResizeTextarea() {
    userInput.style.height = 'auto';
    userInput.style.height = (userInput.scrollHeight) + 'px';
}

// Handle input keypress events
function handleInputKeypress(e) {
    if (e.key === 'Enter' && !e.shiftKey) {
        e.preventDefault();
        sendMessage();
    }
}

// Create and add a message element to the chat
function createMessageElement(content, isUser = false) {
    const messageDiv = document.createElement('div');
    messageDiv.className = `message ${isUser ? 'user-message' : 'bot-message'}`;
    
    if (isUser) {
        messageDiv.textContent = content;
    } else {
        messageDiv.innerHTML = marked.parse(content);
        
        // Add execute buttons to code blocks
        messageDiv.querySelectorAll('pre code').forEach((block, index) => {
            const wrapper = document.createElement('div');
            wrapper.className = 'code-block';
            
            const executeBtn = document.createElement('button');
            executeBtn.className = 'execute-btn';
            executeBtn.textContent = 'Execute';
            executeBtn.onclick = () => executeCode(block.textContent, index);
            
            block.parentNode.parentNode.insertBefore(wrapper, block.parentNode);
            wrapper.appendChild(block.parentNode);
            wrapper.appendChild(executeBtn);
        });
    }
    
    // Add loading animation for bot messages
    if (!isUser) {
        messageDiv.style.opacity = '0';
        messageDiv.style.transform = 'translateY(20px)';
        setTimeout(() => {
            messageDiv.style.opacity = '1';
            messageDiv.style.transform = 'translateY(0)';
        }, 100);
    }
    
    return messageDiv;
}

// Send message to the server
async function sendMessage() {
    const content = userInput.value.trim();
    if (!content || isProcessing) return;

    isProcessing = true;

    try {
        // Add user message
        const userMessageElement = createMessageElement(content, true);
        chatContainer.appendChild(userMessageElement);
        messages.push({ "role": "user", "content": content });

        // Clear input and reset height
        userInput.value = '';
        autoResizeTextarea();

        // Create bot message container
        const botMessageElement = document.createElement('div');
        botMessageElement.className = 'message bot-message';
        botMessageElement.style.opacity = '0';
        botMessageElement.style.transform = 'translateY(20px)';
        chatContainer.appendChild(botMessageElement);
        scrollToBottom();

        // Stream response
        const response = await fetch('/chat', {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json'
            },
            body: JSON.stringify({ messages: messages })
        });

        const reader = response.body.getReader();
        const decoder = new TextDecoder();
        let botResponse = '';

        while (true) {
            const { value, done } = await reader.read();
            if (done) break;
            
            const chunk = decoder.decode(value);
            const lines = chunk.split('\n');
            
            for (const line of lines) {
                if (line.startsWith('data: ')) {
                    try {
                        const data = JSON.parse(line.slice(6));
                        if (data.choices) {
                            if (data.choices[0].delta?.content) {
                                // Streaming response
                                botResponse += data.choices[0].delta.content;
                            } else if (data.choices[0].message?.content) {
                                // Non-streaming response
                                botResponse += data.choices[0].message.content;
                            }
                            botMessageElement.innerHTML = marked.parse(botResponse);
                            
                            // Apply syntax highlighting to any code blocks
                            botMessageElement.querySelectorAll('pre code').forEach((block) => {
                                hljs.highlightElement(block);
                            });
                            
                            scrollToBottom();
                        }
                    } catch (e) {
                        console.error('Error parsing SSE data:', e);
                    }
                }
            }
        }
        
        // Add code block buttons after response is complete
        botMessageElement.querySelectorAll('pre').forEach((preElement, index) => {
            // Create wrapper
            const wrapper = document.createElement('div');
            wrapper.className = 'code-block';
            
            // Create button container
            const buttonContainer = document.createElement('div');
            buttonContainer.className = 'code-actions';
            
            // Create copy button
            const copyButton = document.createElement('button');
            copyButton.className = 'copy-btn';
            copyButton.innerHTML = `
                <svg class="copy-icon" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
                    <rect x="9" y="9" width="13" height="13" rx="2" ry="2"></rect>
                    <path d="M5 15H4a2 2 0 0 1-2-2V4a2 2 0 0 1 2-2h9a2 2 0 0 1 2 2v1"></path>
                </svg>
                <svg class="check-icon" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
                    <path d="M20 6L9 17l-5-5"></path>
                </svg>
                <span>Copy</span>
            `;
            
            // Create execute button
            const executeButton = document.createElement('button');
            executeButton.className = 'execute-btn';
            executeButton.innerHTML = `
                <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
                    <polygon points="5 3 19 12 5 21 5 3"></polygon>
                </svg>
                <span>Run</span>
            `;
            
            // Get the code content
            const codeElement = preElement.querySelector('code');
            const codeContent = codeElement ? codeElement.textContent : '';
            
            // Add event listeners
            copyButton.addEventListener('click', () => copyCode(copyButton, codeContent));
            executeButton.addEventListener('click', () => executeCode(codeContent, index));
            
            // Append buttons
            buttonContainer.appendChild(copyButton);
            buttonContainer.appendChild(executeButton);
            
            // Insert wrapper and move elements
            preElement.parentNode.insertBefore(wrapper, preElement);
            wrapper.appendChild(preElement);
            wrapper.appendChild(buttonContainer);
        });
        
        // Show the message with animation
        setTimeout(() => {
            botMessageElement.style.opacity = '1';
            botMessageElement.style.transform = 'translateY(0)';
        }, 100);
        
        // Add bot message to messages array
        messages.push({ "role": "assistant", "content": botResponse });
        
    } catch (error) {
        console.error('Error:', error);
        const errorMessage = createMessageElement('Sorry, there was an error processing your request. Please try again.');
        chatContainer.appendChild(errorMessage);
    } finally {
        isProcessing = false;
        scrollToBottom();
    }
}

// Execute code blocks
async function executeCode(code, blockIndex) {
    try {
        console.log('Executing code:', code); // Debug log
        
        // Ensure code is properly trimmed
        const trimmedCode = code.trim();
        
        const response = await fetch('/execute', {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json'
            },
            body: JSON.stringify({ code: trimmedCode })
        });

        if (!response.ok) {
            throw new Error(`HTTP error! status: ${response.status}`);
        }

        const result = await response.json();
        console.log('Execution result:', result); // Debug log
        
        const resultContent = result.success 
            ? '```\nExecution result:\n' + result.output + '\n```'
            : '```\nError:\n' + result.error + '\n```';
            
        const resultElement = document.createElement('div');
        resultElement.className = 'message bot-message';
        resultElement.innerHTML = marked.parse(resultContent);
        
        // Apply syntax highlighting to the result
        resultElement.querySelectorAll('pre code').forEach((block) => {
            hljs.highlightElement(block);
        });
        
        chatContainer.appendChild(resultElement);
        scrollToBottom();
        
    } catch (error) {
        console.error('Error executing code:', error);
        const errorElement = document.createElement('div');
        errorElement.className = 'message bot-message';
        errorElement.innerHTML = marked.parse('```\nError executing code: ' + error.message + '\n```');
        chatContainer.appendChild(errorElement);
        scrollToBottom();
    }
}

// Initialize code blocks with syntax highlighting
function initializeCodeBlocks(container) {
    container.querySelectorAll('pre code').forEach((block) => {
        hljs.highlightElement(block);
    });
}

// Handle scroll animations
function handleScroll() {
    const messages = chatContainer.querySelectorAll('.message');
    messages.forEach(message => {
        const rect = message.getBoundingClientRect();
        const isVisible = rect.top >= 0 && rect.bottom <= window.innerHeight;
        
        if (isVisible) {
            message.style.opacity = '1';
            message.style.transform = 'translateY(0)';
        }
    });
}

// Smooth scroll to bottom of chat
function scrollToBottom() {
    chatContainer.scrollTo({
        top: chatContainer.scrollHeight,
        behavior: 'smooth'
    });
}

// Process message queue
async function processMessageQueue() {
    if (messageQueue.length > 0 && !isProcessing) {
        const nextMessage = messageQueue.shift();
        await sendMessage(nextMessage);
    }
}

// Add message to queue
function queueMessage(content) {
    messageQueue.push(content);
    processMessageQueue();
}

// Create copy button with icon
function createCopyButton() {
    const button = document.createElement('button');
    button.className = 'copy-btn';
    button.innerHTML = `
        <svg class="copy-icon" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
            <rect x="9" y="9" width="13" height="13" rx="2" ry="2"></rect>
            <path d="M5 15H4a2 2 0 0 1-2-2V4a2 2 0 0 1 2-2h9a2 2 0 0 1 2 2v1"></path>
        </svg>
        <svg class="check-icon" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
            <path d="M20 6L9 17l-5-5"></path>
        </svg>
        <span>Copy</span>
    `;
    return button;
}

// Copy code to clipboard with visual feedback
async function copyCode(button, code) {
    try {
        await navigator.clipboard.writeText(code.trim());
        button.classList.add('success');
        const span = button.querySelector('span');
        span.textContent = 'Copied!';
        
        setTimeout(() => {
            button.classList.remove('success');
            span.textContent = 'Copy';
        }, 2000);
    } catch (err) {
        console.error('Failed to copy code:', err);
        button.classList.add('error');
        const span = button.querySelector('span');
        span.textContent = 'Failed';
        
        setTimeout(() => {
            button.classList.remove('error');
            span.textContent = 'Copy';
        }, 2000);
    }
}

function createMessageElement(content, isUser = false) {
    const messageDiv = document.createElement('div');
    messageDiv.className = `message ${isUser ? 'user-message' : 'bot-message'}`;
    
    if (isUser) {
        messageDiv.textContent = content;
    } else {
        messageDiv.innerHTML = marked.parse(content);
        
        // Add copy and execute buttons to code blocks
        messageDiv.querySelectorAll('pre code').forEach((block, index) => {
            const wrapper = document.createElement('div');
            wrapper.className = 'code-block';
            
            const buttonContainer = document.createElement('div');
            buttonContainer.className = 'code-actions';
            
            // Create copy button
            const copyButton = document.createElement('button');
            copyButton.className = 'copy-btn';
            copyButton.innerHTML = `
                <svg class="copy-icon" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
                    <rect x="9" y="9" width="13" height="13" rx="2" ry="2"></rect>
                    <path d="M5 15H4a2 2 0 0 1-2-2V4a2 2 0 0 1 2-2h9a2 2 0 0 1 2 2v1"></path>
                </svg>
                <svg class="check-icon" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
                    <path d="M20 6L9 17l-5-5"></path>
                </svg>
                <span>Copy</span>
            `;
            copyButton.onclick = () => copyCode(copyButton, block.textContent);
            
            // Create execute button
            const executeButton = document.createElement('button');
            executeButton.className = 'execute-btn';
            executeButton.innerHTML = `
                <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
                    <polygon points="5 3 19 12 5 21 5 3"></polygon>
                </svg>
                <span>Run</span>
            `;
            executeButton.onclick = () => executeCode(block.textContent, index);
            
            buttonContainer.appendChild(copyButton);
            buttonContainer.appendChild(executeButton);
            
            // Place the code block in the wrapper
            block.parentNode.parentNode.insertBefore(wrapper, block.parentNode);
            wrapper.appendChild(block.parentNode);
            wrapper.appendChild(buttonContainer);
        });
        
        // Initialize syntax highlighting
        messageDiv.querySelectorAll('pre code').forEach((block) => {
            hljs.highlightElement(block);
        });
    }
    
    return messageDiv;
}

// Export functions for potential external use
window.sendMessage = sendMessage;
window.executeCode = executeCode;
window.toggleTheme = toggleTheme;