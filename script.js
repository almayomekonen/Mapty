'use strict';

class workout {
  date = new Date();
  id = (Date.now() + '').slice(-10);
  clicks = 0;

  constructor(coords, distance, duration) {
    this.coords = coords; // [lat,lng]
    this.distance = distance; // in km
    this.duration = duration; // in min
  }
  _setDescription() {
    const months = [
      'January',
      'February',
      'March',
      'April',
      'May',
      'June',
      'July',
      'August',
      'September',
      'October',
      'November',
      'December',
    ];

    this.description = `${this.type[0].toUpperCase()}${this.type.slice(1)} on ${
      months[this.date.getMonth()]
    } ${this.date.getDate()}`;
  }
  click() {
    this.clicks++;
  }
}

class Running extends workout {
  type = 'running';

  constructor(coords, distance, duration, cadence) {
    super(coords, distance, duration);
    this.cadence = cadence;
    this.calcPace();
    this._setDescription();
  }
  calcPace() {
    // min km//
    this.pace = this.duration / this.distance;
    return this.pace;
  }
}

class Cycling extends workout {
  type = 'cycling';

  constructor(coords, distance, duration, elevetionGain) {
    super(coords, distance, duration);
    this.elevetionGain = elevetionGain;
    this.calcSpeed();
    this._setDescription();
  }
  calcSpeed() {
    // km/h
    this.speed = this.distance / (this.duration / 60);
    return this.speed;
  }
}

// APPLICATION ARCHITECTURE

const form = document.querySelector('.form');
const containerWorkouts = document.querySelector('.workouts');
const inputType = document.querySelector('.form__input--type');
const inputDistance = document.querySelector('.form__input--distance');
const inputDuration = document.querySelector('.form__input--duration');
const inputCadence = document.querySelector('.form__input--cadence');
const inputElevation = document.querySelector('.form__input--elevation');
const Workoutlistbutton = document.querySelector('.workouts__listButton');
const Workouts = document.querySelector('.workouts__list');
class App {
  map;
  mapZoomLevel = 13;
  mapEvent;
  workouts = [];

  constructor() {
    // Get users Positions
    this._getPosition();

    // Get data From local Storage
    this._getLocalStorage();

    // Event Handlers
    Workoutlistbutton.addEventListener('click', function () {
      Workouts.classList.toggle('hidden__list');
    });
    document
      .querySelector('.workouts__delete-all')
      .addEventListener('click', this._deleteAllWorkouts.bind(this));

    document
      .querySelector('#submitBtn')
      .addEventListener('click', this._newWorkout.bind(this));
    form.addEventListener('submit', this._newWorkout.bind(this));
    inputType.addEventListener('change', this._toggleElevetionField);
    containerWorkouts.addEventListener('click', this._MoveToPopup.bind(this));
  }

  _deleteAllWorkouts() {
    // Remove all workouts from the workouts array
    this.workouts = [];

    // Remove all workout markers from the map
    for (const workout of this.workouts) {
      workout.marker.remove();
    }

    // Clear the workouts container
    containerWorkouts.innerHTML = '';

    // Clear local storage
    this._setLocalStorage();

    location.reload();
  }

  _getPosition() {
    if (navigator.geolocation)
      navigator.geolocation.getCurrentPosition(
        this._LoadMap.bind(this),
        function () {
          alert('Not work / internet connection');
        }
      );
  }

  _LoadMap(position) {
    const { latitude } = position.coords;
    const { longitude } = position.coords;
    console.log(`https://www.google.com/maps/@3${latitude}.${longitude}`);

    const coords = [latitude, longitude];

    this.map = L.map('map').setView(coords, this.mapZoomLevel);

    L.tileLayer('https://{s}.tile.openstreetmap.fr/hot/{z}/{x}/{y}.png', {
      attribution:
        '&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a> contributors',
    }).addTo(this.map);
    // handling clicks on The map
    this.map.on('click', this._ShowForm.bind(this));

    this.map.on('click', () => {
      document.querySelector('.pressMap').style.display = 'none';
    });

    this.workouts.forEach(work => {
      this._renderWorkoutMarker(work);
    });
  }

  _ShowForm(mapE) {
    this.mapEvent = mapE;
    form.classList.remove('hidden');
    inputDistance.focus();
  }

  _hideForm() {
    // Empty inputs
    inputDistance.value =
      inputCadence.value =
      inputDuration.value =
      inputElevation.value =
        '';

    form.classList.add('hidden');
  }

  _toggleElevetionField() {
    inputElevation.closest('.form__row').classList.toggle('form__row--hidden');
    inputCadence.closest('.form__row').classList.toggle('form__row--hidden');
  }

  _newWorkout(e) {
    const validInputs = (...inputs) =>
      inputs.every(inp => Number.isFinite(inp));

    const allPositive = (...inputs) => inputs.every(inp => inp > 0);

    e.preventDefault();

    // Get data from the form
    const type = inputType.value;
    const distance = +inputDistance.value;
    const duration = +inputDuration.value;
    const { lat, lng } = this.mapEvent.latlng;
    let workout;

    // check if data is valid

    if (type === 'running') {
      const cadence = +inputCadence.value;
      // Check if data valid
      if (
        !validInputs(distance, duration, cadence) ||
        !allPositive(distance, duration, cadence)
      )
        return alert('Inputs have to be positive Numbers!');

      workout = new Running([lat, lng], distance, duration, cadence);
    }

    // if workout cycling , create cycling object
    if (type === 'cycling') {
      const elevation = +inputElevation.value;
      if (
        !validInputs(distance, duration, elevation) ||
        !allPositive(distance, duration)
      )
        return alert('Inputs have to be positive Numbers!');
      workout = new Cycling([lat, lng], distance, duration, elevation);
    }
    // add new object to workout Array
    this.workouts.push(workout);

    // render workout on map as a marker
    this._renderWorkoutMarker(workout);

    // Render workout on list
    this._renderWorkout(workout);

    // hide form + clear input fields
    this._hideForm();

    // set local storage to all workouts
    this._setLocalStorage();
  }
  _renderWorkoutMarker(workout) {
    L.marker(workout.coords)
      .addTo(this.map)
      .bindPopup(
        L.popup({
          maxWidth: 290,
          minWidth: 100,
          autoClose: false,
          closeOnClick: false,
          className: `${workout.type}-popup`,
          style: `${workout.type} leaflet-popup-content-wrapper`,
        })
      )
      .setPopupContent(
        `${workout.type === 'running' ? '🏃‍♂️' : '🚴‍♀️'} ${workout.description}`
      )
      .openPopup();

    workout.marker = workout;
  }

  _renderWorkout(workout) {
    let html = `

    <li class="workout workout--${workout.type}" data-id="${workout.id}">
     <h2 class="workout__title">${workout.description}</h2>
     <div class="workout__details">
     <span class="workout__icon">${
       workout.type === 'running' ? '🏃‍♂️' : '🚴‍♀️'
     } </span>
      
     <span class="workout__value">${workout.distance}</span>
     <span class="workout__unit">km</span>
     
     </div>
     <div class="workout__details">
     <span class="workout__icon">⏱</span>
     <span class="workout__value">${workout.duration}</span>
     <span class="workout__unit">min</span>
     </div>
    `;

    if (workout.type === 'running')
      html += `
      <div  class="workout__details">
       <span class="workout__icon">⚡️</span>
       <span class="workout__value">${workout.pace.toFixed(1)}</span>
       <span class="workout__unit">min/km</span>
       </div> 
       <div class="workout__details">
       <span class="workout__icon">🦶🏼</span>
       <span class="workout__value">${workout.cadence}</span>
       <span class="workout__unit">spm</span>
     </div>
     </li>`;

    if (workout.type === 'cycling')
      html += ` 
      <div class="workout__details">
     <span class="workout__icon">⚡️</span>
     <span class="workout__value">${workout.speed.toFixed(1)}</span>
     <span class="workout__unit">km/h</span>
     </div>
     <div class="workout__details">
     <span class="workout__icon">⛰</span>
     <span class="workout__value">${workout.elevetionGain}</span>
     <span class="workout__unit">m</span>
      </div>
        </li>`;

    const tablebody = document.getElementById('workoutsTableBody');
    let moreHtml = `
    <div class="centerListworkouts">
    <td class="description">${workout.description} </td>
    <tr class="workout workout--${workout.type}" data-id="${workout.id}">
     
      <td> 🏃‍♂️ ${workout.distance} km </td>
      <td> ⏱ ${workout.duration} Min</td>
      <td> ⚡️${
        workout.type === 'running'
          ? workout.pace.toFixed(1)
          : workout.speed.toFixed(1)
      }</td>
      <td> 
     🦶🏼 ${
       workout.type === 'running' ? workout.cadence : workout.elevetionGain
     } spm  </td>
    </tr> 
    </div>
    `;
    tablebody.insertAdjacentHTML('beforeend', moreHtml);

    form.insertAdjacentHTML('afterend', html);
  }

  _MoveToPopup(e) {
    const workoutEl = e.target.closest('.workout');
    if (!workoutEl) return;

    const workout = this.workouts.find(
      work => work.id === workoutEl.dataset.id
    );

    this.map.setView(workout.coords, this.mapZoomLevel, {
      animate: true,
      pan: { duration: 1 },
    });
  }

  _setLocalStorage() {
    const workoutWithoutMarker = this.workouts.map(workout => {
      const { marker, ...workoutWithoutMarker } = workout;
      return workoutWithoutMarker;
    });
    localStorage.setItem('workouts', JSON.stringify(workoutWithoutMarker));
  }
  _getLocalStorage() {
    const data = JSON.parse(localStorage.getItem('workouts'));

    if (!data) return;

    this.workouts = data;
    this.workouts.forEach(work => {
      this._renderWorkout(work);
    });
  }
  reset() {
    localStorage.removeItem('workouts');
    location.reload();
  }
}

const app = new App();
