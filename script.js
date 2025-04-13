// Global variables
let scene, camera, renderer;
let animals = [];
let clickedAnimals = new Set();
let targetCount = 0;
let currentCount = 0;
let gamePhase = 'loading'; // loading, counting, answering, finished

// Raycasting for clicks/touches
const raycaster = new THREE.Raycaster();
const pointer = new THREE.Vector2();

// Texture Loader
const textureLoader = new THREE.TextureLoader();
let currentAnimalTexture;

// Animal Data (Add paths to your actual images!)
const animalData = [
    { name: 'Butterfly', imagePath: 'images/butterfly.png' },
    { name: 'Rabbit', imagePath: 'images/rabbit.png' },
    { name: 'Lion', imagePath: 'images/lion.png' },
    { name: 'Girrafe', imagePath: 'images/girrafe.png' },
    { name: 'Elephant', imagePath: 'images/elephant.png' },
    { name: 'Panda', imagePath: 'images/panda.png' },
    { name: 'Penguin', imagePath: 'images/penguin.png' },
    { name: 'Tiger', imagePath: 'images/tiger.png' },
    { name: 'Zebra', imagePath: 'images/zebra.png' },
    { name: 'Skunk', imagePath: 'images/skunk.png' },

];
let currentAnimalName = '';

// UI Elements
const uiOverlay = document.getElementById('ui-overlay');
const countDisplay = document.getElementById('count-display');
const finalQuestionDiv = document.getElementById('final-question');
const answerButtonsDiv = document.getElementById('answer-buttons');
const feedbackDiv = document.getElementById('feedback');
const restartButton = document.getElementById('restart-button');
const gameContainer = document.getElementById('game-container');

// --- Initialization ---
function init() {
    // Scene
    scene = new THREE.Scene();
    scene.background = null; // Make background transparent

    // Camera
    const aspect = window.innerWidth / window.innerHeight;
    camera = new THREE.PerspectiveCamera(75, aspect, 0.1, 1000);
    camera.position.z = 15; // Adjust based on object size

    // Renderer
    renderer = new THREE.WebGLRenderer({ 
        antialias: true, 
        alpha: true,
        premultipliedAlpha: false // Add this to ensure proper transparency
    }); 
    renderer.setSize(window.innerWidth, window.innerHeight);
    renderer.setPixelRatio(window.devicePixelRatio); // Better quality on high-res screens
    renderer.setClearColor(0x000000, 0); // Set clear color to transparent
    gameContainer.appendChild(renderer.domElement);

    // Lighting
    const ambientLight = new THREE.AmbientLight(0xffffff, 0.6);
    scene.add(ambientLight);
    const directionalLight = new THREE.DirectionalLight(0xffffff, 0.8);
    directionalLight.position.set(5, 10, 7);
    scene.add(directionalLight);

    // Assets will be loaded in startGame now, not init
    // textureLoader.load(...) // Removed from here

    // Event Listeners
    window.addEventListener('resize', onWindowResize);
    // Use 'pointerdown' for both mouse clicks and touch events
    gameContainer.addEventListener('pointerdown', onPointerDown);
    restartButton.addEventListener('click', startGame);

    // Start the game logic (which now includes texture loading)
    startGame();
}

// --- Game Logic ---

function startGame() {
    gamePhase = 'loading'; // Start in loading phase
    currentCount = 0;
    clickedAnimals.clear();
    currentAnimalTexture = null; // Reset texture

    // Clear previous animals
    animals.forEach(a => scene.remove(a));
    animals = [];

    // Reset UI
    countDisplay.textContent = `Loading...`; // Show loading message
    finalQuestionDiv.classList.add('hidden');
    feedbackDiv.classList.add('hidden');
    restartButton.classList.add('hidden');
    uiOverlay.style.pointerEvents = 'none'; // Allow clicks on canvas again

    // Determine target count based on user input range
    const minCountInput = document.getElementById('min-count');
    const maxCountInput = document.getElementById('max-count');
    let minCount = parseInt(minCountInput.value) || 1;
    let maxCount = parseInt(maxCountInput.value) || 10;

    // Basic validation and correction for range inputs
    if (minCount < 1) minCount = 1;
    if (maxCount > 20) maxCount = 20;
    if (minCount > maxCount) {
        // Swap if min is greater than max
        [minCount, maxCount] = [maxCount, minCount];
        minCountInput.value = minCount; // Update input value visually
        maxCountInput.value = maxCount; // Update input value visually
    }

    targetCount = Math.floor(Math.random() * (maxCount - minCount + 1)) + minCount;
    // targetCount = Math.floor(Math.random() * 10) + 1; // Old way
    console.log(`Target Count (Range: ${minCount}-${maxCount}):`, targetCount);

    // Select a random animal
    const randomAnimalIndex = Math.floor(Math.random() * animalData.length);
    const selectedAnimal = animalData[randomAnimalIndex];
    currentAnimalName = selectedAnimal.name;
    console.log("Selected Animal:", currentAnimalName);

    // Load the selected animal's texture
    textureLoader.load(
        selectedAnimal.imagePath,
        (texture) => {
            currentAnimalTexture = texture;
            console.log(`${currentAnimalName} texture loaded.`);
            gamePhase = 'counting'; // Move to counting phase
             countDisplay.textContent = `Count: 0`; // Update count display now

            // Create Animals *after* texture is loaded
            for (let i = 0; i < targetCount; i++) {
                createAnimal(i); // Pass unique ID
            }

            // Ensure animation loop starts/continues if needed
            // Check if already running to avoid multiple loops
             if (!renderer.info.render.frame) {
                animate();
             }

        },
        undefined, // onProgress callback not needed here
        (error) => {
            console.error(`An error happened loading the ${currentAnimalName} texture:`, error);
            countDisplay.textContent = `Error loading ${currentAnimalName} image!`;
            gamePhase = 'finished'; // Can't play without image
        }
    );

    // Don't start animation loop here, start it after texture loads or if already running
    // animate();
}

function createAnimal(id) {
    if (!currentAnimalTexture) { // Check the current texture
        console.error("Animal texture not loaded yet!");
        return;
    }

    // Increase size by 50% (from 2 to 3)
    const geometry = new THREE.PlaneGeometry(3, 3); // Increased from 2,2 to 3,3
    const material = new THREE.MeshStandardMaterial({
        map: currentAnimalTexture, // Use the loaded texture
        transparent: true,
        side: THREE.DoubleSide, // Render both sides
        alphaTest: 0.5 // Adjust if transparent edges look blocky
    });

    const animal = new THREE.Mesh(geometry, material);

    // Random Position within view
    const bounds = getCameraViewBounds(camera);
    animal.position.x = THREE.MathUtils.randFloat(bounds.x * 0.8, -bounds.x * 0.8);
    animal.position.y = THREE.MathUtils.randFloat(bounds.y * 0.8, -bounds.y * 0.8);
    animal.position.z = THREE.MathUtils.randFloat(-2, 2); // Add some depth variation

    // Random rotation for variety
    animal.rotation.z = THREE.MathUtils.randFloat(0, Math.PI * 2);

    // Store data useful for clicking
    animal.userData = {
        isAnimal: true,
        id: id,
        clicked: false
    };

    animals.push(animal);
    scene.add(animal);
}

function onPointerDown(event) {
    console.log(`Pointer Down Event. Game Phase: ${gamePhase}`); // Log phase
    if (gamePhase !== 'counting') return;

    // Calculate pointer position
    const rect = renderer.domElement.getBoundingClientRect();
    pointer.x = ((event.clientX - rect.left) / rect.width) * 2 - 1;
    pointer.y = -((event.clientY - rect.top) / rect.height) * 2 + 1;
    console.log(`Pointer Coords: x=${pointer.x.toFixed(2)}, y=${pointer.y.toFixed(2)}`); // Log coords

    // Update the picking ray
    raycaster.setFromCamera(pointer, camera);

    // Calculate objects intersecting the picking ray
    const intersects = raycaster.intersectObjects(animals); 
    console.log(`Raycaster intersected ${intersects.length} objects.`);

    // Iterate through all intersected objects (closest first)
    for (const intersect of intersects) {
        const clickedObject = intersect.object;
        console.log(`Checking intersected object ID: ${clickedObject.userData.id}, isAnimal: ${clickedObject.userData.isAnimal}`);

        // Check if it's an animal and hasn't been clicked yet
        const alreadyClicked = clickedAnimals.has(clickedObject.userData.id);
        console.log(`Already clicked: ${alreadyClicked}`);

        if (clickedObject.userData.isAnimal && !alreadyClicked) {
            console.log(`Found unclicked animal ${clickedObject.userData.id}. Adding to set and removing from scene.`);
            clickedAnimals.add(clickedObject.userData.id);
            currentCount++;
            countDisplay.textContent = `Count: ${currentCount}`;

            // Remove the object
            scene.remove(clickedObject);
            console.log(`Scene object count after removal (approx): ${scene.children.length}`);

            // --- Audio Feedback (Placeholder) ---
            // playSound(currentCount); // TODO: Implement Web Audio API

            console.log(`Clicked ${currentAnimalName} ${clickedObject.userData.id}. Count: ${currentCount}`);

            // Check for win condition
            if (currentCount === targetCount) {
                console.log("All animals clicked!");
                gamePhase = 'answering';
                setTimeout(showFinalQuestion, 500); // Short delay
            }

            // IMPORTANT: Stop checking other intersections once we've processed one click
            break; 
        } else {
            // Log if we skipped this intersection because it wasn't an animal or was already clicked
            console.log(`Skipping intersected object ID: ${clickedObject.userData.id} (isAnimal: ${clickedObject.userData.isAnimal}, alreadyClicked: ${alreadyClicked})`);
        }
    }
}

function showFinalQuestion() {
    finalQuestionDiv.classList.remove('hidden');
    feedbackDiv.classList.add('hidden'); // Hide previous feedback
    feedbackDiv.textContent = '';
    uiOverlay.style.pointerEvents = 'auto'; // Make UI interactive

    // Clear old buttons
    answerButtonsDiv.innerHTML = '';

    // Create answer buttons (1-20)
    for (let i = 1; i <= 20; i++) {
        const button = document.createElement('button');
        button.textContent = i;
        button.value = i;
        button.classList.add('answer-button');
        button.addEventListener('click', handleAnswer);
        answerButtonsDiv.appendChild(button);
    }
}

function handleAnswer(event) {
    // If already finished (correct answer chosen), don't process further clicks
    if (gamePhase === 'finished') return;

    const selectedNumber = parseInt(event.target.value);
    // Don't change gamePhase to 'finished' yet

    feedbackDiv.classList.remove('hidden');
    if (selectedNumber === targetCount) {
        gamePhase = 'finished'; // Set phase to finished only on correct answer
        feedbackDiv.textContent = "Correct!";
        feedbackDiv.className = 'correct';

        // Play Correct Sound
        try {
            const correctSound = new Audio('audio/correct.mp3');
            correctSound.play();
        } catch (error) {
            console.error("Error playing sound:", error);
        }

        // Disable buttons ONLY when correct
        answerButtonsDiv.querySelectorAll('button').forEach(btn => btn.disabled = true);

        restartButton.classList.remove('hidden'); // Show Play Again

    } else {
        // Incorrect Answer
        feedbackDiv.textContent = `Not quite! Try again.`; // Changed message
        feedbackDiv.className = 'incorrect';

        // Play Specific Incorrect Sound based on the target number
        try {
            // Construct the path dynamically based on the correct answer (targetCount)
            const incorrectSoundPath = `audio/wrong_press_${targetCount}.mp3`; // e.g., audio/wrong_press_8.mp3
            const incorrectSound = new Audio(incorrectSoundPath);
            incorrectSound.play();
            console.log(`Playing incorrect sound: ${incorrectSoundPath}`); // Log which file is attempted
        } catch (error) {
            console.error("Error playing specific incorrect sound:", error);
            // Fallback to a generic sound if specific one fails?
            // try { const generic = new Audio('audio/incorrect.mp3'); generic.play(); } catch (e) {}
        }

        // --- DO NOT disable buttons here ---
        // --- DO NOT show restart button here --- 
    }

    // This line was moved inside the 'if correct' block:
    // answerButtonsDiv.querySelectorAll('button').forEach(btn => btn.disabled = true);

    // This line was moved inside the 'if correct' block:
    // restartButton.classList.remove('hidden');
}


// --- Utility Functions ---

function getCameraViewBounds(camera) {
    const vFOV = THREE.MathUtils.degToRad(camera.fov); // Vertical FOV in radians
    const height = 2 * Math.tan(vFOV / 2) * Math.abs(camera.position.z);
    const width = height * camera.aspect;
    return { x: width / 2, y: height / 2 };
}

function onWindowResize() {
    camera.aspect = window.innerWidth / window.innerHeight;
    camera.updateProjectionMatrix();
    renderer.setSize(window.innerWidth, window.innerHeight);
}

// --- Animation Loop ---
function animate() {
    // Only loop if the game isn't fully finished waiting for restart
    if (gamePhase !== 'finished_and_waiting') {
         requestAnimationFrame(animate);
    }


    // Optional: Add subtle animation to animals if they are still visible
    animals.forEach(a => {
        if (a.parent === scene && gamePhase === 'counting') { // Only animate if visible and in counting phase
            // Example: Gentle hover
             a.position.y += Math.sin(Date.now() * 0.002 + a.userData.id * 0.5) * 0.01;
             a.rotation.z += 0.005; // Slow rotation
        }
    });


    renderer.render(scene, camera);
}

// --- Start Everything ---
init();