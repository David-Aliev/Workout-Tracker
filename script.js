'use strict';

const form = document.querySelector('.form');
const containerWorkouts = document.querySelector('.workouts');
const inputType = document.querySelector('.form__input--type');
const inputDistance = document.querySelector('.form__input--distance');
const inputDuration = document.querySelector('.form__input--duration');
const inputTemp = document.querySelector('.form__input--temp');
const inputClimb = document.querySelector('.form__input--climb');

class Workout {
  date = new Date();
  id = (Date.now() + '').slice(-10);
  clickNumber = 0;

  constructor(coords, distance, duration) {
    this.coords = coords;
    this.distance = distance; // km
    this.duration = duration; // min
  }

  _setDescription() {
    this.type === 'running'
      ? (this.description = `Пробіжка ${new Intl.DateTimeFormat('ua-UA').format(
          this.date
        )}`)
      : (this.description = `Велотренування ${new Intl.DateTimeFormat(
          'ua-UA'
        ).format(this.date)}`);
  }
}

class Running extends Workout {
  type = 'running';
  constructor(coords, distance, duration, temp) {
    super(coords, distance, duration);
    this.temp = temp;
    this.calculatePace();
    this._setDescription();
  }

  calculatePace() {
    // min/km
    this.pace = this.duration / this.distance;
  }
}

class Cycling extends Workout {
  type = 'cycling';
  constructor(coords, distance, duration, climb) {
    super(coords, distance, duration);
    this.climb = climb;
    this.calculateSpeed();
    this._setDescription();
  }

  calculateSpeed() {
    // km/h
    this.speed = this.distance / this.duration / 60;
  }
}

// const running = new Running([50,39],7,40,170);
// const cyling = new Cycling([50,39],37,80,70);
// console.log(running,cyling);

class App {
  #map;
  #mapEvent;
  #workouts = [];

  constructor() {
    // отримання координат користувача
    this._getPosition();

    // отримання данихи з localStorage
    this._getLocalStorageData();

    form.addEventListener('submit', this._newWorkout.bind(this)); // bind,бо this без нього вказує на форму,а треба щоб вказував на об єкт
    // зміна при переключання типу на пробіжку/велосипед
    inputType.addEventListener('change', this._toggleClimbField);

    containerWorkouts.addEventListener('click', this._moveToWorkout.bind(this));
  }

  _getPosition() {
    if (navigator.geolocation) {
      navigator.geolocation.getCurrentPosition(
        this._loadMap.bind(this),
        function () {
          alert('Не можливо отримати вашу геолокацію');
        }
      );
    }
  }

  _loadMap(position) {
    const { latitude } = position.coords;
    const { longitude } = position.coords;
    console.log(latitude);
    console.log(longitude);
    console.log(
      `https://www.google.com.ua/maps/@${latitude},${longitude},13z?entry=ttu`
    );

    const coords = [latitude, longitude];

    this.#map = L.map('map').setView(coords, 13);

    L.tileLayer('https://tile.openstreetmap.org/{z}/{x}/{y}.png', {
      attribution:
        '&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a> contributors',
    }).addTo(this.#map);

    // L.marker(coords)
    //   .addTo(this.#map)
    //   .bindPopup('A pretty CSS popup.<br> Easily customizable.')
    //   .openPopup();

    // обробка кліків на карті
    this.#map.on('click', this._showForm.bind(this));

    // відображення тренувань з localStorage
    this.#workouts.forEach(workout => {
      this._displayWorkout(workout);
    })
  }

  _showForm(e) {
    this.#mapEvent = e;
    form.classList.remove('hidden');
    inputDistance.focus();
  }

  _hideForm() {
    inputDistance.value =
      inputDuration.value =
      inputTemp.value =
      inputClimb.value =
        '';
    form.classList.add('hidden');
  }

  _toggleClimbField() {
    inputClimb.closest('.form__row').classList.toggle('form__row--hidden');
    inputTemp.closest('.form__row').classList.toggle('form__row--hidden');
  }

  _newWorkout(e) {
    e.preventDefault(); // щоб не було перезагрузки
    const { lat, lng } = this.#mapEvent.latlng;
    let workout;

    const areNumbers = (...numbers) =>
      numbers.every(num => Number.isFinite(num));

    const areNumbersPositive = (...numbers) => numbers.every(num => num > 0);

    // отримати дані з форми
    const type = inputType.value;
    const distance = +inputDistance.value;
    const duration = +inputDuration.value;

    // якщо тренування буде пробіжкою-створити об єкт running
    if (type === 'running') {
      const temp = +inputTemp.value;
      // провірити валідність даних
      if (
        // !Number.isFinite(distance) ||
        // !Number.isFinite(duration) ||
        // !Number.isFinite(temp)
        !areNumbers(distance, duration, temp) ||
        !areNumbersPositive(distance, duration, temp)
      )
        return alert('Введіть число!');

      workout = new Running([lat, lng], distance, duration, temp);
    }

    // якщо тренування буде велотренування-створити об єкт Cycling
    if (type === 'cycling') {
      const climb = +inputClimb.value;
      // провірити валідність даних
      if (
        // !Number.isFinite(distance) ||
        // !Number.isFinite(duration) ||
        // !Number.isFinite(climb)
        !areNumbers(distance, duration, climb) ||
        !areNumbersPositive(distance, duration)
      )
        return alert('Введіть число!');

      workout = new Cycling([lat, lng], distance, duration, climb);
    }
    // добавити новий об єкт в масив тренувань
    this.#workouts.push(workout);
    console.log(workout);
    console.log(this.#workouts);

    // відобразити тренування на карті
    this._displayWorkout(workout);

    // відобразити тренування в списку
    this._displayWorkoutOnSidebare(workout);

    // очистка полів ввода даних і приховування форми
    this._hideForm();

    // добавити всі тренування в localStorage
    this._addWorkoutToLocalStorage();
  }

  _displayWorkout(workout) {
    L.marker(workout.coords)
      .addTo(this.#map)
      .bindPopup(
        L.popup({
          autoClose: false,
          closeOnClick: false,
          className: `${workout.type}-popup`,
        })
      )
      .openPopup()
      .setPopupContent(
        `${workout.type === 'running' ? '🏃' : '🚵‍♂️'} ${workout.description}`
      );
  }

  _displayWorkoutOnSidebare(workout) {
    let html = `<li class="workout workout--${workout.type}" data-id="${
      workout.id
    }">
          <h2 class="workout__title">${workout.description}</h2>
            <div class="workout__details">
              <span class="workout__icon">${
                workout.type === 'running' ? '🏃' : '🚵‍♂️'
              }</span>
              <span class="workout__value">${workout.distance}</span>
              <span class="workout__unit">км</span>
            </div>
            <div class="workout__details">
              <span class="workout__icon">⏱</span>
              <span class="workout__value">${workout.duration}</span>
              <span class="workout__unit">хв</span>
            </div>
          `;
    if (workout.type === 'running') {
      html += ` 
          <div class="workout__details">
            <span class="workout__icon">📏⏱</span>
            <span class="workout__value">${workout.pace.toFixed(2)}</span>
            <span class="workout__unit">м/хв</span>
          </div>
          <div class="workout__details">
            <span class="workout__icon">👟⏱</span>
            <span class="workout__value">${workout.temp}</span>
            <span class="workout__unit">крок/хв</span>
          </div>
        </li>`;
    }
    if (workout.type === 'cycling') {
      html += ` <div class="workout__details">
            <span class="workout__icon">📏⏱</span>
            <span class="workout__value">${workout.speed.toFixed(2)}</span>
            <span class="workout__unit">км/год</span>
          </div>
          <div class="workout__details">
            <span class="workout__icon">🏔</span>
            <span class="workout__value">${workout.climb}</span>
            <span class="workout__unit">м</span>
          </div>
        </li>`;
    }
    form.insertAdjacentHTML('afterend', html);
  }
  _moveToWorkout(e) {
    const workoutElement = e.target.closest('.workout');
    console.log(workoutElement);

    if (!workoutElement) return;

    const workout = this.#workouts.find(
      item => item.id === workoutElement.dataset.id
    );

    this.#map.setView(workout.coords, 13, {
      animate: true,
      pan: {
        duration: 1,
      },
    });
  }
  _addWorkoutToLocalStorage() {
    localStorage.setItem('workouts',JSON.stringify(this.#workouts));
  }
  _getLocalStorageData() {
    const data = JSON.parse(localStorage.getItem('workouts'));

    if(!data) return;

    this.#workouts = data;

    this.#workouts.forEach(workout => {
      this._displayWorkoutOnSidebare(workout);
    })
  }

  reset() {
    localStorage.removeItem('workouts');
    location.reload();
  }
}

const app = new App();
