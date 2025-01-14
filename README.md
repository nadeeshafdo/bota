# BOTA AI Assistant

## About

BOTA AI Assistant is a web application built using Flask that allows users to interact with a specified AI model to perform actions on their local machine. The application supports executing Python code snippets directly from the chat interface, with the code being executed on the server and capable of interacting with the client's machine.

## Quick Start

### Prerequisites

- Python 3.8 or higher
- pip (Python package manager)

### Steps to Run Locally

1. **Clone the Repository**

   ```sh
   git clone https://github.com/nadeeshafdo/bota.git
   cd bota
   ```

2. **Install Dependencies**

   ```sh
   pip install -r requirements.txt
   ```

3. **Configure the Application**

   - Copy the `bota.config.json` file and rename it to `bota.config.local.json` if you want to modify the configuration without affecting the original file.
   - Update the `bota.config.local.json` file with your API keys and model details.

4. **Set Environment Variable (Optional)**

   If you are using a custom configuration file, set the `BOTA_CONFIG` environment variable to point to your configuration file:

   ```sh
   export BOTA_CONFIG=bota.config.local.json
   ```

5. **Run the Application**

   ```sh
   python app.py
   ```

6. **Access the Application**

   Open your web browser and go to [http://127.0.0.1:5000/](http://127.0.0.1:5000/) to interact with BOTA AI Assistant.

## Usage

BOTA AI Assistant is designed to help developers automate and manage their projects through an interactive chat interface. Here are some ways you can use it:

1. **Create Code Snippets**: Prompt Bota to perform various tasks, such as data processing, web scraping, or automation scripts.
2. **Manage Projects**: Use Bota to help organize and manage your projects by generating boilerplate code, setting up project structures, and providing best practices.
3. **Automate Tasks**: Automate repetitive tasks, such as file operations, system administration, or data analysis.

## Security Considerations

Given that this application allows execution of Python code on the server, it is crucial to ensure that the server environment is secure and that code execution is properly sandboxed to prevent unauthorized access or malicious actions.

## License

This project is licensed under the MIT License - see the [LICENSE](LICENSE) file for details.
