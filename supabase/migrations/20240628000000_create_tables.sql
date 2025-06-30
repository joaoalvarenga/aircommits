-- Create users table
CREATE TABLE IF NOT EXISTS public.users (
  id uuid not null default gen_random_uuid (),
  created_at TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now()) NOT NULL,
  github_id text null,
  username text null,
  avatar text null,
  constraint users_pkey primary key (id),
  constraint users_id_fkey foreign KEY (id) references auth.users (id)
);

-- Create airports table
CREATE TABLE IF NOT EXISTS public.airports (
    id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
    code TEXT UNIQUE NOT NULL,
    name TEXT NOT NULL,
    city TEXT NOT NULL,
    country TEXT NOT NULL,
    latitude DECIMAL(10,8) NOT NULL,
    longitude DECIMAL(11,8) NOT NULL,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now()) NOT NULL,
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now()) NOT NULL
);

-- Create signals table
CREATE TABLE IF NOT EXISTS public.signals (
    id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
    user_id UUID NOT NULL REFERENCES public.users(id) ON DELETE CASCADE,
    airport TEXT,
    flight TEXT,
    message TEXT,
    latitude DECIMAL(10,8),
    longitude DECIMAL(11,8),
    timestamp TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now()) NOT NULL,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now()) NOT NULL,
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now()) NOT NULL
);

-- Create indexes for better performance
CREATE INDEX IF NOT EXISTS idx_airports_code ON public.airports(code);
CREATE INDEX IF NOT EXISTS idx_airports_location ON public.airports(latitude, longitude);
CREATE INDEX IF NOT EXISTS idx_signals_user_id ON public.signals(user_id);
CREATE INDEX IF NOT EXISTS idx_signals_timestamp ON public.signals(timestamp DESC);
CREATE INDEX IF NOT EXISTS idx_signals_airport ON public.signals(airport);
CREATE INDEX IF NOT EXISTS idx_signals_flight ON public.signals(flight);

-- Enable Row Level Security (RLS)
ALTER TABLE public.users ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.airports ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.signals ENABLE ROW LEVEL SECURITY;

-- Create policies for users table
CREATE POLICY "Users can view their own data" ON public.users
    FOR SELECT USING (auth.uid() = id);

-- Users can insert their own signals
CREATE POLICY "Users can insert their own data" ON public.users
    FOR INSERT WITH CHECK (auth.uid()::text = id::text);

-- Anyone can read airports (public data)
CREATE POLICY "Anyone can view airports" ON public.airports
    FOR SELECT USING (true);

-- Users can create signals
CREATE POLICY "Users can create signals" ON public.signals
    FOR INSERT WITH CHECK (auth.uid()::text = user_id::text);

-- Anyone can read signals (public feed)
CREATE POLICY "Anyone can view signals" ON public.signals
    FOR SELECT USING (true);

-- Users can update their own signals
CREATE POLICY "Users can update own signals" ON public.signals
    FOR UPDATE USING (auth.uid()::text = user_id::text);

-- Users can delete their own signals
CREATE POLICY "Users can delete own signals" ON public.signals
    FOR DELETE USING (auth.uid()::text = user_id::text);

-- Create function to update updated_at timestamp
CREATE OR REPLACE FUNCTION update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
    NEW.updated_at = timezone('utc'::text, now());
    RETURN NEW;
END;
$$ language 'plpgsql';

-- Create triggers to automatically update updated_at
CREATE TRIGGER update_airports_updated_at BEFORE UPDATE ON public.airports
    FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_signals_updated_at BEFORE UPDATE ON public.signals
    FOR EACH ROW EXECUTE FUNCTION update_updated_at_column(); 

-- Create function to insert user data when a new user is created
CREATE OR REPLACE FUNCTION insert_user_data()
RETURNS TRIGGER AS $$
BEGIN
    INSERT INTO public.users (id, github_id, username, avatar) VALUES (NEW.id, NEW.raw_user_meta_data->>'sub', NEW.raw_user_meta_data->>'user_name', NEW.raw_user_meta_data->>'avatar_url');
    RETURN NEW;
END;
$$ language 'plpgsql' security definer;

-- Create trigger to insert user data when a new user is created
CREATE TRIGGER insert_user_data AFTER INSERT ON auth.users
    FOR EACH ROW EXECUTE FUNCTION insert_user_data();   