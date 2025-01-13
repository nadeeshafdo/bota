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
