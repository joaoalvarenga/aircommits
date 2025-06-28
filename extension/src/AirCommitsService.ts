import * as vscode from 'vscode';
import axios from 'axios';

export interface Location {
  latitude: number;
  longitude: number;
}

export interface Airport {
  code: string;
  name: string;
  city: string;
  country: string;
}

export interface Signal {
  id: string;
  userId: string;
  username: string;
  userAvatar: string;
  airport?: string;
  flight?: string;
  location?: Location;
  timestamp: string;
  message?: string;
}

export interface User {
  id: string;
  username: string;
  avatar: string;
  email: string;
}

export class AirCommitsService {
  private serverUrl: string;
  private token: string | undefined;

  constructor() {
    this.serverUrl = vscode.workspace.getConfiguration('aircommits').get('serverUrl', 'http://localhost:3001');
  }

  async initialize(context: vscode.ExtensionContext): Promise<void> {
    this.token = await context.secrets.get('aircommits.token');
  }

  async setToken(token: string, context: vscode.ExtensionContext): Promise<void> {
    this.token = token;
    await context.secrets.store('aircommits.token', token);
  }

  private getHeaders(): Record<string, string> {
    const headers: Record<string, string> = {
      'Content-Type': 'application/json'
    };
    
    if (this.token) {
      headers['Authorization'] = `Bearer ${this.token}`;
    }
    
    return headers;
  }

  async getCurrentUser(): Promise<User | null> {
    if (!this.token) return null;

    try {
      const response = await axios.get(`${this.serverUrl}/auth/me`, {
        headers: this.getHeaders()
      });
      return response.data;
    } catch (error) {
      console.error('Error getting current user:', error);
      return null;
    }
  }

  async getLocation(): Promise<Location | null> {
    const config = vscode.workspace.getConfiguration('aircommits');

    try {
      // In a real implementation, you would use a geolocation service
      // For now, we'll simulate getting location from IP
      const response = await axios.get('https://ipapi.co/json/');
      return {
        latitude: response.data.latitude,
        longitude: response.data.longitude
      };
    } catch (error) {
      console.error('Error getting location:', error);
      return null;
    }
  }

  async detectAirport(location: Location): Promise<Airport | null> {
    try {
      const response = await axios.get(`${this.serverUrl}/airports/nearby`, {
        params: {
          lat: location.latitude,
          lng: location.longitude,
          radius: 50 // 50km radius
        },
        headers: this.getHeaders()
      });
      
      if (response.data.airports && response.data.airports.length > 0) {
        return response.data.airports[0];
      }
      
      return null;
    } catch (error) {
      console.error('Error detecting airport:', error);
      return null;
    }
  }

  async sendSignal(airport?: string, flight?: string, message?: string): Promise<boolean> {
    if (!this.token) {
      vscode.window.showErrorMessage('Please login first');
      return false;
    }

    try {
      const config = vscode.workspace.getConfiguration('aircommits');
      const manualAirport = config.get('manualAirport', '');
      const manualFlight = config.get('manualFlight', '');

      const signalData: any = {
        airport: airport || manualAirport || undefined,
        flight: flight || manualFlight || undefined,
        message: message || 'Working from VS Code'
      };

      // If no manual settings, try to detect location and airport
      if (!signalData.airport && !signalData.flight) {
        const location = await this.getLocation();
        if (location) {
          signalData.location = location;
          const detectedAirport = await this.detectAirport(location);
          if (detectedAirport) {
            signalData.airport = detectedAirport.code;
          }
        }
      }

      const response = await axios.post(`${this.serverUrl}/signals`, signalData, {
        headers: this.getHeaders()
      });

      return response.status === 201;
    } catch (error) {
      console.error('Error sending signal:', error);
      vscode.window.showErrorMessage('Failed to send signal');
      return false;
    }
  }

  async getSignals(filters?: { airport?: string; flight?: string }): Promise<Signal[]> {
    try {
      const params = new URLSearchParams();
      if (filters?.airport) params.append('airport', filters.airport);
      if (filters?.flight) params.append('flight', filters.flight);

      const response = await axios.get(`${this.serverUrl}/signals?${params.toString()}`, {
        headers: this.getHeaders()
      });
      
      return response.data;
    } catch (error) {
      console.error('Error getting signals:', error);
      return [];
    }
  }

  async getAirports(): Promise<Airport[]> {
    try {
      const response = await axios.get(`${this.serverUrl}/airports`, {
        headers: this.getHeaders()
      });
      
      return response.data;
    } catch (error) {
      console.error('Error getting airports:', error);
      return [];
    }
  }

  async searchAirports(query: string): Promise<Airport[]> {
    try {
      const response = await axios.get(`${this.serverUrl}/airports/search`, {
        params: { q: query },
        headers: this.getHeaders()
      });
      
      return response.data;
    } catch (error) {
      console.error('Error searching airports:', error);
      return [];
    }
  }
} 