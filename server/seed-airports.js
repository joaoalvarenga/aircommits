const Airport = require('./models/Airport');
const sequelize = require('./database');

const airports = [
  {
    code: 'PLU',
    name: 'Pampulha Airport',
    city: 'Belo Horizonte',
    country: 'Brazil',
    latitude: -19.8511,
    longitude: -43.9506
  },
  {
    code: 'CNF',
    name: 'Tancredo Neves International Airport',
    city: 'Belo Horizonte',
    country: 'Brazil',
    latitude: -19.6244,
    longitude: -43.9719
  },
  {
    code: 'GRU',
    name: 'São Paulo/Guarulhos International Airport',
    city: 'São Paulo',
    country: 'Brazil',
    latitude: -23.4356,
    longitude: -46.4731
  },
  {
    code: 'JFK',
    name: 'John F. Kennedy International Airport',
    city: 'New York',
    country: 'United States',
    latitude: 40.6413,
    longitude: -73.7781
  },
  {
    code: 'LAX',
    name: 'Los Angeles International Airport',
    city: 'Los Angeles',
    country: 'United States',
    latitude: 33.9416,
    longitude: -118.4085
  },
  {
    code: 'LHR',
    name: 'London Heathrow Airport',
    city: 'London',
    country: 'United Kingdom',
    latitude: 51.4700,
    longitude: -0.4543
  },
  {
    code: 'CDG',
    name: 'Charles de Gaulle Airport',
    city: 'Paris',
    country: 'France',
    latitude: 49.0097,
    longitude: 2.5479
  },
  {
    code: 'NRT',
    name: 'Narita International Airport',
    city: 'Tokyo',
    country: 'Japan',
    latitude: 35.6762,
    longitude: 139.6503
  },
  {
    code: 'SYD',
    name: 'Sydney Airport',
    city: 'Sydney',
    country: 'Australia',
    latitude: -33.9399,
    longitude: 151.1753
  },
  {
    code: 'YYZ',
    name: 'Toronto Pearson International Airport',
    city: 'Toronto',
    country: 'Canada',
    latitude: 43.6777,
    longitude: -79.6248
  },
  {
    code: 'FRA',
    name: 'Frankfurt Airport',
    city: 'Frankfurt',
    country: 'Germany',
    latitude: 50.0379,
    longitude: 8.5622
  },
  {
    code: 'AMS',
    name: 'Amsterdam Airport Schiphol',
    city: 'Amsterdam',
    country: 'Netherlands',
    latitude: 52.3105,
    longitude: 4.7683
  }
];

async function seedAirports() {
  try {
    await sequelize.sync({ force: false });
    
    for (const airport of airports) {
      await Airport.findOrCreate({
        where: { code: airport.code },
        defaults: airport
      });
    }
    
    console.log('Airports seeded successfully!');
    process.exit(0);
  } catch (error) {
    console.error('Error seeding airports:', error);
    process.exit(1);
  }
}

seedAirports(); 