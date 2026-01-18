<p align="center">
  <h1 align="center">Zipper Merge Lab</h1>
  <p align="center">
    <strong>An interactive traffic simulation demonstrating the effectiveness of zipper merging</strong>
  </p>
</p>

---

## About

Zipper Merge Lab is an interactive web-based simulation that visualizes how different driver behaviors affect traffic flow during lane merges. The simulation allows you to compare different merging strategies side-by-side and see real-time metrics on throughput and fairness.

### What is a Zipper Merge?

A zipper merge (or late merge) is a traffic merging technique where drivers use both lanes until reaching the merge point, then alternate like the teeth of a zipper. This is more efficient than early merging, which creates a longer single-lane backup.

---

## Features

- **Dual Simulation View** - Run two simulations simultaneously to compare different driver behaviors
- **Adjustable Parameters**
  - **Merge Tendency** - Controls when drivers attempt to merge (early vs. late/zipper)
  - **Cooperation** - How willing drivers are to let others merge in front of them
  - **Following Distance** - How close cars follow each other
- **Advanced Variance Controls** - Add randomness to driver behaviors for more realistic simulations
- **Real-time Metrics**
  - **Throughput** - Cars per second passing through the merge
  - **Fairness** - How equal the travel times are across all drivers
- **Smooth Animations** - Cars render with smooth movement, turn signals, and visual details
- **Mobile Responsive** - Works on desktop and mobile devices

---

## Getting Started

### Quick Start (No Installation Required)

Simply open `index.html` in your web browser. That's it!

```
ZipperMerge/
└── index.html  <-- Double-click to open
```

### Alternative: Running with Flask

If you prefer to run a local development server:

1. Make sure you have Python 3.x installed

2. Install Flask:
   ```bash
   pip install flask
   ```

3. Run the application:
   ```bash
   python __init__.py
   ```

4. Open your browser to `http://localhost:5000`

---

## How It Works

### The Simulation

Each simulation models a two-lane road where one lane is blocked ahead, forcing cars to merge. Cars are generated with randomized behaviors based on the slider settings and must navigate the merge.

### Driver Behaviors

| Parameter | Low Value (0) | High Value (1) |
|-----------|---------------|----------------|
| **Merge Tendency** | Early merge (merge as soon as possible) | Zipper merge (merge at the last moment) |
| **Cooperation** | Selfish (won't let others in) | Cooperative (yields to merging cars) |
| **Following Distance** | Tailgating (close following) | Cautious (large gaps) |

### Metrics

- **Throughput**: Measures how many cars pass through per second. Higher is better.
- **Fairness**: Measures consistency in travel times (1.0 = all cars take the same time, lower = some cars wait much longer than others).

---

## Project Structure

```
ZipperMerge/
├── index.html            # Main HTML file (open this!)
├── __init__.py           # Flask application (optional)
├── README.MD             # This file
└── static/
    └── js/
        ├── simulation.js # Main simulation controller
        ├── car.js        # Car class and properties
        ├── carLogic.js   # Decision-making logic for cars
        ├── road.js       # Road management and car coordination
        ├── render.js     # Canvas rendering and animations
        └── utils.js      # Utility functions
```

---

## AI Generation Disclosure

This project was created with a combination of human work and AI assistance. In the interest of transparency:

### Human-Created

- **Core driving logic** (`car.js`, `carLogic.js`) - The algorithms determining how cars decide when to merge, how they calculate following distances, and how they interact with other vehicles
- **Road management** (`road.js`) - The foundational road structure, car positioning, and coordination logic (with some AI enhancements for fairness metrics)
- **Utility functions** (`utils.js`) - Statistical helper functions
- **Project concept and design** - The overall idea, parameter choices, and simulation goals

### AI-Generated

- **Simulation wrapper class** (`simulation.js`) - The class that encapsulates simulations for multiple independent instances
- **Rendering system** (`render.js`) - Canvas drawing, car graphics, animations, and visual effects
- **CSS styling** - Responsive design and mobile-friendly layout
- **This README** - Documentation and project description

### Collaborative

- **HTML template** (`index.html`) - Structure created collaboratively with AI assistance for styling and responsiveness

---

## License

This project is open source and available under the MIT License.

---

## Contributing

Contributions are welcome! Feel free to open issues or submit pull requests.

---

<p align="center">
  <sub>Built to demonstrate that zipper merging really does work better.</sub>
</p>
