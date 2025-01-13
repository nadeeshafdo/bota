# Project Documentation

## Directory Structure


```

├── 📄 app.py
├── 📄 bota.config.json
├── 📁 static
│   ├── 📄 script.js
│   └── 📄 style.css
├── 📁 templates
│   └── 📄 index.html
└── 📁 ui

```

## File Contents


### app.py


```py
from flask import Flask, render_template, request, Response, jsonify
from flask_cors import CORS
import json
import os
import requests
import subprocess
import tempfile
import uuid
from functools import lru_cache

# Flask application setup
app = Flask(__name__)
CORS(app)

class ModelInstance:
    """
    Represents a model instance with specific parameters and methods to interact with it.
    """

    def __init__(self, api_key, model_name, api_url_template, temperature, max_tokens, top_p, stream):
        self.api_key = api_key
        self.model_name = model_name
        self.api_url = api_url_template.format(HF_MODELS=model_name)
        self.temperature = temperature
        self.max_tokens = max_tokens
        self.top_p = top_p
        self.stream = stream

    def get_response(self, messages):
        """
        Gets response from the Hugging Face API, handling both streaming and non-streaming cases.
        """
        headers = {
            "Authorization": f"Bearer {self.api_key}",
            "Content-Type": "application/json"
        }

        payload = {
            "model": self.model_name,
            "messages": messages,
            "temperature": self.temperature,
            "max_tokens": self.max_tokens,
            "top_p": self.top_p,
            "stream": self.stream
        }

        try:
            response = requests.post(self.api_url, headers=headers, json=payload, stream=self.stream)
            response.raise_for_status()
            
            if self.stream:
                # Handle streaming response
                for line in response.iter_lines():
                    if line:
                        json_str = line.decode('utf-8').replace('data: ', '')
                        if json_str != '[DONE]':
                            yield f"data: {json.dumps(json.loads(json_str))}\n\n"
            else:
                # Handle non-streaming response
                response_json = response.json()
                yield f"data: {json.dumps(response_json)}\n\n"
                
        except requests.RequestException as e:
            yield f"data: {json.dumps({'error': str(e)})}\n\n"

@lru_cache()
def load_config(file="bota.config.json"):
    """
    Loads the configuration file and caches the result.
    """
    try:
        with open(file, "r") as config_file:
            return json.load(config_file)
    except FileNotFoundError:
        raise FileNotFoundError(f"Configuration file '{file}' not found.")
    except json.JSONDecodeError as e:
        raise ValueError(f"Error decoding JSON: {e}")
    except Exception as e:
        raise Exception(f"Error loading configuration: {e}")

def create_instances():
    """
    Dynamically creates model instances based on configuration.
    """
    config = load_config()
    api_key = config["HF_API_KEY"]
    api_url_template = config["API_URL_TEMPLATE"]

    instances = {}
    for instance in config["INSTANCES"]:
        instances[instance["name"]] = ModelInstance(
            api_key=api_key,
            model_name=config["HF_MODELS"][instance["model"]],
            api_url_template=api_url_template,
            temperature=instance["temperature"],
            max_tokens=instance["max_tokens"],
            top_p=instance["top_p"],
            stream=instance.get("stream")
        )
    return instances

model_instances = create_instances()

@app.route('/chat', methods=['POST'])
def chat():
    """
    Handles chat requests, selecting the appropriate model instance dynamically.
    """
    data = request.get_json()
    instance_name = data.get('instance', 'dev_instance_1')
    messages = data.get('messages', [])

    instance = model_instances.get(instance_name)
    if not instance:
        return jsonify({"error": f"Instance '{instance_name}' not found."}), 400

    return Response(instance.get_response(messages), mimetype='text/event-stream')

@app.route('/execute', methods=['POST'])
def execute():
    """
    Executes the provided Python code and returns the result.
    """
    try:
        data = request.get_json()
        if not data or 'code' not in data:
            return jsonify({'success': False, 'error': 'No code provided'}), 400

        result = execute_code(data['code'])
        return jsonify(result)
    except Exception as e:
        return jsonify({'success': False, 'error': str(e)}), 500

def execute_code(code):
    """
    Executes the given Python code in a temporary file and returns the result.
    """
    try:
        temp_file_path = create_temp_file(code)
        result = subprocess.run(['python', temp_file_path], capture_output=True, text=True, timeout=30)

        os.remove(temp_file_path)

        if result.returncode == 0:
            return {'success': True, 'output': result.stdout or "Code executed successfully with no output."}
        else:
            return {'success': False, 'error': result.stderr or "Unknown error occurred."}
    except subprocess.TimeoutExpired:
        return {'success': False, 'error': 'Code execution timed out.'}
    except Exception as e:
        return {'success': False, 'error': str(e)}

def create_temp_file(code):
    """
    Creates a temporary file with the given code.
    """
    temp_dir = tempfile.gettempdir()
    os.makedirs(temp_dir, exist_ok=True)
    temp_file = os.path.join(temp_dir, f"code_{uuid.uuid4().hex}.py")
    with open(temp_file, 'w', encoding='utf-8') as f:
        f.write(code)
    return temp_file

@app.route('/')
def home():
    """
    Renders the homepage.
    """
    return render_template('index.html')

if __name__ == '__main__':
    app.run(host='0.0.0.0', port=5000, debug=True, threaded=True)

```


### bota.config.json


```json
{
    "HF_API_KEY": "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",
    "HF_MODELS": {
        "32B_instruct": "Qwen/Qwen2.5-Coder-32B-Instruct",
        "72B_instruct": "Qwen/Qwen2.5-72B-Instruct",
        "32B_preview": "Qwen/QwQ-32B-Preview"
    },
    "DEFAULT_MODEL": "32B_instruct",
    "API_URL_TEMPLATE": "https://api-inference.huggingface.co/models/{HF_MODELS}/v1/chat/completions",
    "INSTANCES": [
        {
            "name": "dev_instance_1",
            "model": "32B_instruct",
            "temperature": 0.7,
            "max_tokens": 4096,
            "top_p": 0.7,
            "stream": true
        }
    ]
}

```


### static\script.js


```js
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
```


### static\style.css


```css
:root {
    /* Light theme variables */
    --light-bg: #ffffff;
    --light-surface: rgba(255, 255, 255, 0.8);
    --light-text: #1a1a1a;
    --light-secondary-text: #666666;
    --light-border: rgba(0, 0, 0, 0.1);
    --light-hover: rgba(0, 0, 0, 0.05);
    --light-accent: #2563eb;
    --light-code-bg: #f8f9fa;

    /* Dark theme variables */
    --dark-bg: #0f172a;
    --dark-surface: rgba(30, 41, 59, 0.8);
    --dark-text: #e2e8f0;
    --dark-secondary-text: #94a3b8;
    --dark-border: rgba(255, 255, 255, 0.1);
    --dark-hover: rgba(255, 255, 255, 0.05);
    --dark-accent: #60a5fa;
    --dark-code-bg: #1e293b;

    /* Common variables */
    --header-height: 4rem;
    --input-height: 6rem;
    --max-width: 1200px;
    --border-radius: 12px;
    --transition-speed: 0.3s;
}

/* Base styles */
* {
    margin: 0;
    padding: 0;
    box-sizing: border-box;
}

body {
    font-family: 'Inter', sans-serif;
    line-height: 1.6;
    transition: background-color var(--transition-speed);
    min-height: 100vh;
    background-attachment:fixed;
    background-repeat: no-repeat;
    background-size: cover;
}

/* Theme specific styles */
body.light-theme {
    background-color: var(--light-bg);
    color: var(--light-text);
    background-image: url('https://image.pollinations.ai/prompt/background%20image%20for%20a%20web%20app%20light%20themed');
}

body.dark-theme {
    background-color: var(--dark-bg);
    color: var(--dark-text);
    background-image: url('https://image.pollinations.ai/prompt/background%20image%20for%20a%20web%20app%20dark%20themed');
}

/* App Container */
.app-container {
    max-width: var(--max-width);
    margin: 0 auto;
    height: 100vh;
    display: flex;
    flex-direction: column;
}

/* Header Styles */
.header {
    position: sticky;
    top: 0;
    z-index: 100;
    backdrop-filter: blur(10px);
    -webkit-backdrop-filter: blur(10px);
}

.light-theme .header {
    background-color: rgba(255, 255, 255, 0.8);
    border-bottom: 1px solid var(--light-border);
}

.dark-theme .header {
    background-color: rgba(15, 23, 42, 0.8);
    border-bottom: 1px solid var(--dark-border);
}

.header-content {
    max-width: var(--max-width);
    margin: 0 auto;
    padding: 1rem 2rem;
    display: flex;
    justify-content: space-between;
    align-items: center;
}

.header h1 {
    font-size: 1.5rem;
    font-weight: 600;
}

/* Theme Toggle Button */
.theme-toggle {
    background: none;
    border: none;
    cursor: pointer;
    padding: 0.5rem;
    border-radius: 50%;
    display: flex;
    align-items: center;
    justify-content: center;
    transition: background-color var(--transition-speed);
}

.theme-toggle:hover {
    background-color: var(--light-hover);
}

.dark-theme .theme-toggle:hover {
    background-color: var(--dark-hover);
}

.theme-toggle svg {
    width: 1.5rem;
    height: 1.5rem;
    transition: transform var(--transition-speed);
}

.light-theme .moon-icon,
.dark-theme .sun-icon {
    display: none;
}

/* Main Container */
.main-container {
    flex: 1;
    display: flex;
    flex-direction: column;
    padding: 1rem 2rem;
    gap: 1rem;
    height: calc(100vh - var(--header-height));
}

/* Chat Container */
.chat-container {
    flex: 1;
    overflow-y: auto;
    padding: 1rem;
    display: flex;
    flex-direction: column;
    gap: 1rem;
    border-radius: var(--border-radius);
}

.light-theme .chat-container {
    background: var(--light-surface);
}

.dark-theme .chat-container {
    background: var(--dark-surface);
}

/* Message Styles */
.message {
    max-width: 80%;
    padding: 1rem;
    border-radius: var(--border-radius);
    animation: fadeIn 0.3s ease-in-out;
}

@keyframes fadeIn {
    from { opacity: 0; transform: translateY(10px); }
    to { opacity: 1; transform: translateY(0); }
}

.user-message {
    align-self: flex-end;
    background: var(--light-accent);
    color: white;
    margin-left: 20%;
}

.dark-theme .user-message {
    background: var(--dark-accent);
}

.bot-message {
    align-self: flex-start;
    margin-right: 20%;
}

.light-theme .bot-message {
    background: white;
    box-shadow: 0 2px 4px rgba(0, 0, 0, 0.1);
}

.dark-theme .bot-message {
    background: var(--dark-code-bg);
    box-shadow: 0 2px 4px rgba(0, 0, 0, 0.2);
}

/* Welcome Message */
.welcome-message {
    text-align: center;
    padding: 2rem;
    background: var(--light-surface);
    border-radius: var(--border-radius);
    margin: 2rem 0;
}

.dark-theme .welcome-message {
    background: var(--dark-surface);
}

/* Input Container */
.input-container {
    position: sticky;
    bottom: 0;
    padding: 1rem 0;
    backdrop-filter: blur(10px);
    -webkit-backdrop-filter: blur(10px);
}

.input-wrapper {
    display: flex;
    gap: 1rem;
    padding: 0.75rem;
    border-radius: var(--border-radius);
    transition: all var(--transition-speed);
}

.light-theme .input-wrapper {
    background: white;
    box-shadow: 0 2px 8px rgba(0, 0, 0, 0.1);
}

.dark-theme .input-wrapper {
    background: var(--dark-surface);
    box-shadow: 0 2px 8px rgba(0, 0, 0, 0.2);
}

/* Textarea Styles */
#user-input {
    flex: 1;
    padding: 0.75rem;
    border: none;
    border-radius: var(--border-radius);
    resize: none;
    font-family: inherit;
    font-size: 1rem;
    outline: none;
    background: transparent;
}

.light-theme #user-input {
    color: var(--light-text);
}

.dark-theme #user-input {
    color: var(--dark-text);
}

#user-input::placeholder {
    color: var(--light-secondary-text);
}

.dark-theme #user-input::placeholder {
    color: var(--dark-secondary-text);
}

/* Send Button */
.send-button {
    background: none;
    border: none;
    cursor: pointer;
    padding: 0.5rem;
    border-radius: 50%;
    display: flex;
    align-items: center;
    justify-content: center;
    transition: all var(--transition-speed);
}

.send-button svg {
    width: 1.5rem;
    height: 1.5rem;
    transition: transform var(--transition-speed);
}

.light-theme .send-button {
    color: var(--light-accent);
}

.dark-theme .send-button {
    color: var(--dark-accent);
}

.send-button:hover {
    background-color: var(--light-hover);
}

.dark-theme .send-button:hover {
    background-color: var(--dark-hover);
}

.send-button:hover svg {
    transform: translateX(2px);
}

/* Code Block Styles */
pre {
    border-radius: var(--border-radius);
    margin: 1rem 0;
    position: relative;
}

.light-theme pre {
    background: var(--light-code-bg);
}

.dark-theme pre {
    background: var(--dark-code-bg);
}

code {
    font-family: 'Fira Code', monospace;
    font-size: 0.9rem;
}

/* Execute Button Styles */
.execute-btn {
    position: absolute;
    right: 1rem;
    top: 1rem;
    padding: 0.5rem 1rem;
    border-radius: var(--border-radius);
    border: none;
    cursor: pointer;
    font-size: 0.8rem;
    font-weight: 500;
    transition: all var(--transition-speed);
}

.light-theme .execute-btn {
    background: var(--light-accent);
    color: white;
}

.dark-theme .execute-btn {
    background: var(--dark-accent);
    color: white;
}

.execute-btn:hover {
    opacity: 0.9;
    transform: translateY(-1px);
}

/* Scrollbar Styles */
::-webkit-scrollbar {
    width: 8px;
}

::-webkit-scrollbar-track {
    background: transparent;
}

::-webkit-scrollbar-thumb {
    background: var(--light-border);
    border-radius: 4px;
}

.dark-theme ::-webkit-scrollbar-thumb {
    background: var(--dark-border);
}

/* Responsive Design */
@media (max-width: 768px) {
    .header-content {
        padding: 1rem;
    }

    .main-container {
        padding: 0.5rem;
    }

    .message {
        max-width: 90%;
    }

    .input-wrapper {
        margin: 0 0.5rem;
    }
}

/* Code Block Container */
.code-block {
    position: relative;
    margin: 1rem 0;
}

/* Action Buttons Container */
.code-actions {
    position: absolute;
    right: 1rem;
    top: 1rem;
    display: flex;
    gap: 0.5rem;
    opacity: 0;
    transition: opacity var(--transition-speed);
}

.code-block:hover .code-actions {
    opacity: 1;
}

/* Copy and Execute Buttons */
.copy-btn,
.execute-btn {
    padding: 0.5rem 1rem;
    border-radius: var(--border-radius);
    border: none;
    cursor: pointer;
    font-size: 0.8rem;
    font-weight: 500;
    display: flex;
    align-items: center;
    gap: 0.5rem;
    transition: all var(--transition-speed);
}

.light-theme .copy-btn,
.light-theme .execute-btn {
    background: var(--light-accent);
    color: white;
}

.dark-theme .copy-btn,
.dark-theme .execute-btn {
    background: var(--dark-accent);
    color: white;
}

.copy-btn:hover,
.execute-btn:hover {
    opacity: 0.9;
    transform: translateY(-1px);
}

/* Copy Success Animation */
.copy-btn.success {
    background: #10B981 !important;
}

/* Copy Icon */
.copy-icon {
    width: 14px;
    height: 14px;
}

/* Success Check Icon */
.check-icon {
    width: 14px;
    height: 14px;
    display: none;
}

.success .copy-icon {
    display: none;
}

.success .check-icon {
    display: block;
}

.code-block {
    position: relative;
    margin: 1rem 0;
    background: var(--light-code-bg);
    border-radius: var(--border-radius);
}

.dark-theme .code-block {
    background: var(--dark-code-bg);
}

.code-actions {
    position: absolute;
    right: 0.5rem;
    top: 0.5rem;
    display: flex;
    gap: 0.5rem;
    opacity: 0;
    transition: opacity var(--transition-speed);
}

.code-block:hover .code-actions {
    opacity: 1;
}

.copy-btn,
.execute-btn {
    display: flex;
    align-items: center;
    gap: 0.5rem;
    padding: 0.5rem 1rem;
    border-radius: var(--border-radius);
    border: none;
    cursor: pointer;
    font-size: 0.8rem;
    font-weight: 500;
    transition: all var(--transition-speed);
    background: var(--light-accent);
    color: white;
}

.dark-theme .copy-btn,
.dark-theme .execute-btn {
    background: var(--dark-accent);
}

.copy-btn:hover,
.execute-btn:hover {
    opacity: 0.9;
    transform: translateY(-1px);
}

.copy-btn.success {
    background: #10B981 !important;
}

.copy-btn.error {
    background: #EF4444 !important;
}

.copy-icon,
.check-icon {
    width: 14px;
    height: 14px;
}

.check-icon {
    display: none;
}

.success .copy-icon {
    display: none;
}

.success .check-icon {
    display: block;
}

/* Ensure code blocks have enough padding for buttons */
pre {
    padding: 2.5rem 1rem 1rem 1rem !important;
}

```


### templates\index.html


```html
<!DOCTYPE html>
<html lang="en">
<head>
    <meta charset="UTF-8">
    <meta name="viewport" content="width=device-width, initial-scale=1.0">
    <title>AI Assistant</title>
    <link rel="stylesheet" href="{{ url_for('static', filename='style.css') }}">
    <script src="https://cdn.jsdelivr.net/npm/marked/marked.min.js"></script>
    <script src="https://cdnjs.cloudflare.com/ajax/libs/highlight.js/11.7.0/highlight.min.js"></script>
    <link rel="stylesheet" href="https://cdnjs.cloudflare.com/ajax/libs/highlight.js/11.7.0/styles/github-dark.min.css">
    <link href="https://fonts.googleapis.com/css2?family=Inter:wght@400;500;600&display=swap" rel="stylesheet">
</head>
<body class="light-theme">
    <div class="app-container">
        <!-- Header Section -->
        <header class="header">
            <div class="header-content">
                <h1>BOTA AI Assistant</h1>
                <button id="theme-toggle" class="theme-toggle" aria-label="Toggle theme">
                    <svg class="sun-icon" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
                        <circle cx="12" cy="12" r="5"/>
                        <line x1="12" y1="1" x2="12" y2="3"/>
                        <line x1="12" y1="21" x2="12" y2="23"/>
                        <line x1="4.22" y1="4.22" x2="5.64" y2="5.64"/>
                        <line x1="18.36" y1="18.36" x2="19.78" y2="19.78"/>
                        <line x1="1" y1="12" x2="3" y2="12"/>
                        <line x1="21" y1="12" x2="23" y2="12"/>
                        <line x1="4.22" y1="19.78" x2="5.64" y2="18.36"/>
                        <line x1="18.36" y1="5.64" x2="19.78" y2="4.22"/>
                    </svg>
                    <svg class="moon-icon" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
                        <path d="M21 12.79A9 9 0 1 1 11.21 3 7 7 0 0 0 21 12.79z"/>
                    </svg>
                </button>
            </div>
        </header>

        <!-- Main Chat Section -->
        <main class="main-container">
            <div id="chat-container" class="chat-container">
                <div class="welcome-message">
                    <h2>Welcome! 👋</h2>
                    <p>I'm your AI assistant. How can I help you today?<br>Just tell me to do something!</p>
                </div>
            </div>

            <!-- Input Section -->
            <div class="input-container">
                <div class="input-wrapper">
                    <textarea 
                        id="user-input" 
                        placeholder="Type your message..."
                        rows="1"
                        autofocus
                    ></textarea>
                    <button class="send-button" onclick="sendMessage()">
                        <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
                            <path d="M22 2L11 13"/>
                            <path d="M22 2L15 22L11 13L2 9L22 2z"/>
                        </svg>
                    </button>
                </div>
            </div>
        </main>
    </div>
    <script src="{{ url_for('static', filename='script.js') }}"></script>
</body>
</html>
```

