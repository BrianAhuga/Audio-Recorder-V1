# Audio Recorder V1

A lightweight **browser-based audio recording application** built with HTML, CSS, and JavaScript.

The project demonstrates how modern browser APIs can be used to capture audio directly from a user's microphone and provide a simple, interactive recording experience without requiring a backend server.

## Overview

**Audio Recorder V1** is a frontend-focused project created to explore browser-based audio recording and interaction with media APIs.

The application provides a simple interface for recording audio directly from the browser, making it a practical example of combining HTML for structure, CSS for presentation, and JavaScript for application logic.

## Features

* Record audio directly from the browser
* Microphone access through browser APIs
* Start and stop recording
* Browser-based audio processing
* Simple and responsive interface
* No backend required
* Lightweight frontend implementation

## Technology Stack

| Technology     | Purpose                                 |
| -------------- | --------------------------------------- |
| **HTML5**      | Application structure                   |
| **CSS3**       | Styling and responsive layout           |
| **JavaScript** | Recording logic and browser interaction |
| **Web APIs**   | Microphone and audio functionality      |

## Project Structure

```text
Audio-Recorder-V1/
│
├── index.html
├── script.js
├── style.css
└── README.md
```

## How It Works

The application runs entirely in the browser.

```text
User
  │
  ▼
Open Application
  │
  ▼
Grant Microphone Permission
  │
  ▼
Start Recording
  │
  ▼
Browser Captures Audio
  │
  ▼
Stop Recording
  │
  ▼
Process Recorded Audio
```

The application relies on browser media capabilities to request microphone access and capture audio.

## Getting Started

### Prerequisites

You only need a modern web browser that supports the required browser media APIs.

Recommended browsers include:

* Google Chrome
* Microsoft Edge
* Mozilla Firefox

### Clone the Repository

```bash
git clone https://github.com/BrianAhuga/Audio-Recorder-V1.git
```

Navigate into the project:

```bash
cd Audio-Recorder-V1
```

### Run the Application

Since this is a frontend-only project, you can open:

```text
index.html
```

directly in your browser.

For the best development experience, you can also use **Visual Studio Code with the Live Server extension**.

## Browser Permissions

The application requires access to the device microphone.

When prompted by the browser, select **Allow** to enable audio recording.

Microphone access may behave differently depending on the browser and environment. When deploying the application publicly, use **HTTPS**, as browser media APIs generally require a secure context.

## Learning Objectives

This project demonstrates practical frontend development concepts including:

* HTML5 structure
* CSS styling
* JavaScript event handling
* Browser APIs
* Media device access
* Audio recording
* Client-side application logic
* User interaction
* Permission handling

## Future Improvements

Potential enhancements include:

* Recording timer
* Audio waveform visualization
* Pause and resume recording
* Recording playback
* Download recordings
* Recording history
* Multiple audio format support
* Recording name management
* Volume visualization
* Dark mode
* Mobile optimization
* Audio file upload and storage

## Author

**Brian Ahuga**

Software Engineer specializing in scalable software systems, modern web applications, and full-stack development.

GitHub: [BrianAhuga](https://github.com/BrianAhuga)

## License

This project is intended for learning, experimentation, and portfolio demonstration.
