# Round Table 🛡️ 
**The Digital Sanctuary for Seminar Equality**

> *"Technology is the sword, but equality is the hand that wields it."*

**Round Table** is a web-based interactive prototype and design project aimed at dismantling the barriers of anxiety in university seminars. Inspired by Arthurian egalitarianism, this multi-agent AI sanctuary acts as a digital "Hidden Shield" that allows students—especially those experiencing "Face-Saving" anxiety and language barriers—to iterate their thoughts privately before proclaiming them publicly.

This project was developed as part of the **CPT208 Project** at **XJTLU (Xi'an Jiaotong-Liverpool University)**.

---

## 📖 Table of Contents
- [About the Project](#-about-the-project)
- [Key Features](#-key-features)
- [Research & Design Process](#-research--design-process)
- [Tech Stack](#-tech-stack)
- [Project Structure](#-project-structure)
- [Getting Started](#-getting-started)
- [The Team](#-the-team)

---

## 🎯 About the Project

At XJTLU, the seminar is the heart of academic discourse. Yet, for many international students, it is a battlefield of anxiety. Our research identified that **Face-Saving Culture** and **Cognitive Overload** often silence brilliant minds.

We chose the **Social Track** to leverage AI not as a replacement for human thought, but as a social equalizer. By providing a decentralized, low-pressure environment for thought formulation, we transform the seminar from a high-stakes stage into a collaborative sanctuary where every voice finds its throne.

---

## ✨ Key Features

- **Private Draft Sanctuary ("Thought Space"):** Students can draft ideas privately, eliminating the immediate pressure to perform and the fear of failure.
- **Multi-Agent AI Scaffolding:** An AI partner assists in polishing vocabulary and structuring academic arguments, acting as a supportive companion rather than an intrusive monitor (Peer-First Nudging).
- **Balanced Participation Monitor (Teacher Dashboard):** Facilitators receive real-time analytics on engagement, talk-time ratios, and visual sociograms of conversation flow without disrupting the natural rhythm of teaching.
- **Seamless Public Contribution:** Students choose exactly when to publish their polished thoughts to the group discussion, ensuring psychological safety.

---

## 🔬 Research & Design Process

Our design decisions are heavily backed by rigorous HCI (Human-Computer Interaction) research:
1. **Quantitative & Qualitative Research:** Surveys across 150 students and deep-dive interviews with students and facilitators.
2. **Wizard of Oz Study:** Simulating AI scaffolding with human "wizards" to test user trust and intervention timing.
3. **Persona Development:** Tailored journeys for *Yifei* (The Silent Knight / Student) and *Dr. Sarah* (The Grand Mentor / Facilitator).
4. **Iterative Prototyping:** Transitioned from a "Pull" model (V1 - over-monitoring) to a "Peer-First Nudging" model (V2 - high-fidelity refinement) based on usability testing.

---

## 🛠 Tech Stack

The interactive prototype is built purely with modern front-end technologies, ensuring a lightweight and performant experience:
- **Structure:** HTML5 
- **Styling:** [Tailwind CSS](https://tailwindcss.com/) (via CDN)
- **Interactions & Animations:** Vanilla JavaScript (ES6+), DOM Manipulation, IntersectionObserver API
- **Typography:** Google Fonts (`Cormorant Garamond`, `Plus Jakarta Sans`, `Cinzel`)

---

## 📂 Project Structure

To maintain readability and modularity, the codebase can be structured into dynamically loaded components:

```text
/round-table-project
  ├── index-single.html    # The monolithic 2000+ line original file (Option A)
  │
  ├── index.html           # The componentized skeleton file (Option B)
  ├── style.css            # Custom animations and complex visual styles
  ├── main.js              # Core logic and dynamic component loader (Fetch API)
  └── components/          # Modular HTML fragments
      ├── nav.html         # Navigation bar
      ├── hero.html        # Landing section
      ├── motivation.html  # Project motivation
      └── ...              # Other sections
```
## 🚀 Getting Started

We provide two ways to run this project depending on which version of the code you are viewing:

### Option A: The Single-File Version (Quickest Setup)
If you are using the original, line HTML file, everything (HTML, CSS, and animations) is bundled into a single document.
1. Simply double-click the file (e.g., `index.html`) to open it in any modern browser (Chrome, Edge, Safari).
2. No local server, backend, or plugins are required. It runs completely offline!

### Option B: The Componentized Version (Developer Friendly)
If you are using the modular version where the UI has been split into multiple smaller files inside the `components/` folder, the project uses the native JavaScript `fetch()` API to dynamically load these fragments. **You cannot simply double-click `index.html` to run this version** (browsers will block it due to CORS security policies for `file://` protocols).

**Prerequisites**
- [Visual Studio Code (VS Code)](https://code.visualstudio.com/)
- VS Code Extension: **[Live Server](https://marketplace.visualstudio.com/items?itemName=ritwickdey.LiveServer)**

**Installation & Execution**
1. Clone or download this repository to your local machine.
2. Open the project folder in **VS Code**.
3. Open the componentized `index.html` file.
4. Right-click anywhere in the code editor and select **"Open with Live Server"** (or click the "Go Live" button in the bottom right corner of VS Code).
5. The project will automatically open in your default browser at `http://127.0.0.1:5500`.

---

## 🛡️ The Team

**Knights of the Round Table Guild (CPT208)**

- **Qian Wang** - UI/UX Design Lead *(Master of Visual Strategy and Arthurian Aesthetics)*
- **Zengyi Mei** - User Research Lead *(Voice of the Classroom and Guardian of Inclusivity)*
- **Haoyu Shen** - Technical Architect *(Architect of Logic and Multi-Agent Systems)*
- **Chenye Zhao** - Project Manager *(Guardian of the Quest and Strategic Visionary)*

---
*© 2026 ROUND TABLE GUILD • FORGED AT XJTLU • NON NOBIS SOLUM*
