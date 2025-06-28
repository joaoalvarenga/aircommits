-- Insert sample airports
INSERT INTO public.airports (code, name, city, country, latitude, longitude) VALUES
('CNF', 'Tancredo Neves International Airport', 'Belo Horizonte', 'Brazil', -19.6244, -43.9719),
('GRU', 'São Paulo/Guarulhos International Airport', 'São Paulo', 'Brazil', -23.4356, -46.4731),
('JFK', 'John F. Kennedy International Airport', 'New York', 'United States', 40.6413, -73.7781),
('LAX', 'Los Angeles International Airport', 'Los Angeles', 'United States', 33.9416, -118.4085),
('LHR', 'London Heathrow Airport', 'London', 'United Kingdom', 51.4700, -0.4543),
('CDG', 'Charles de Gaulle Airport', 'Paris', 'France', 49.0097, 2.5479),
('NRT', 'Narita International Airport', 'Tokyo', 'Japan', 35.6762, 139.6503),
('SYD', 'Sydney Airport', 'Sydney', 'Australia', -33.9399, 151.1753),
('YYZ', 'Toronto Pearson International Airport', 'Toronto', 'Canada', 43.6777, -79.6248),
('FRA', 'Frankfurt Airport', 'Frankfurt', 'Germany', 50.0379, 8.5622),
('AMS', 'Amsterdam Airport Schiphol', 'Amsterdam', 'Netherlands', 52.3105, 4.7683)
ON CONFLICT (code) DO NOTHING; 