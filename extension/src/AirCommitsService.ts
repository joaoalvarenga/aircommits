import * as vscode from 'vscode';
import axios from 'axios';
import { SUPABASE_ANON_KEY, SUPABASE_URL } from './config';

export interface Location {
  latitude: number;
  longitude: number;
}

export interface Airport {
  id: string;
  code: string;
  name: string;
  city: string;
  country: string;
  latitude: number;
  longitude: number;
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
  private context: vscode.ExtensionContext;
  private supabaseUrl: string;
  private supabaseAnonKey: string;
  private token: string | undefined;
  private refreshToken: string | undefined;
  private expiresAt: number | undefined;

  constructor(context: vscode.ExtensionContext) {
    this.context = context;
    this.supabaseUrl = SUPABASE_URL;
    this.supabaseAnonKey = SUPABASE_ANON_KEY;
  }

  async initialize(): Promise<void> {
    this.token = await this.context.secrets.get('aircommits.token');
    this.refreshToken = await this.context.secrets.get('aircommits.refreshToken');
    const expiresAt = await this.context.secrets.get('aircommits.expiresAt');
    if (expiresAt) {
      this.expiresAt = parseInt(expiresAt, 10);
    }
  }

  async setToken(token: string, refreshToken: string, expiresAt: number): Promise<void> {
    this.token = token;
    this.refreshToken = refreshToken;
    this.expiresAt = expiresAt
    await this.context.secrets.store('aircommits.token', token);
    await this.context.secrets.store('aircommits.refreshToken', token);
    await this.context.secrets.store('aircommits.expiresAt', expiresAt.toString());
  }

  private getHeaders(): Record<string, string> {
    const headers: Record<string, string> = {
      'Content-Type': 'application/json'
    };
    
    if (this.token) {
      headers['Authorization'] = `Bearer ${this.token}`;
      headers['apikey'] = this.supabaseAnonKey;
    }
    
    return headers;
  }

  async callRefreshToken(): Promise<any | null> {
    try {
      const tokenData = {
        refresh_token: this.refreshToken
      }
      const response = await axios.post(`${this.supabaseUrl}/auth/v1/token?grant_type=refresh_token`, tokenData, {
        headers: this.getHeaders()
      });
      return response.data;
    } catch (error) {
      console.error('Error getting current user:', error);
      return null;
    }
  }

  async getCurrentUser(): Promise<User | null> {
    if (!this.token) return null;

    if (!this.expiresAt || Math.floor(Date.now() / 1000) > this.expiresAt) {
      const response = await this.callRefreshToken();
      if (!response) {
        return null;
      }
      await this.setToken(
        response.access_token,
        response.refresh_token,
        response.expires_at,
      )
      return response.user;
    }

    try {
      const response = await axios.get(`${this.supabaseUrl}/auth/v1/user`, {
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
      const response = await axios.get(`${this.supabaseUrl}/functions/v1/airports/nearby`, {
        params: {
          lat: location.latitude,
          lng: location.longitude,
          radius: 5 // 50km radius
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
      const autoDetectLocation = config.get('autoDetectLocation', true);

      const signalData: any = {
        airport: airport || manualAirport || undefined,
        flight: flight || manualFlight || undefined
      };

      // If no manual settings, try to detect location and airport
      if (autoDetectLocation) {
        signalData.flight = undefined
        signalData.airport = undefined
        const location = await this.getLocation();
        if (location) {
          signalData.latitude = location.latitude;
          signalData.longitude = location.longitude;
          const detectedAirport = await this.detectAirport(location);
          if (detectedAirport) {
            signalData.airport = detectedAirport.code;
          }
        }
      }

      if (!signalData.airport && !signalData.flight) {
        return false;
      }

      const response = await axios.post(`${this.supabaseUrl}/functions/v1/signals`, signalData, {
        headers: this.getHeaders()
      });

      return response.status === 201;
    } catch (error) {
      console.error('Error sending signal:', error);
      // vscode.window.showErrorMessage(`Failed to send signal ${error}`);
      return false;
    }
  }

  async getSignals(filters?: { airport?: string; flight?: string }): Promise<Signal[]> {
    try {
      const params = new URLSearchParams();
      if (filters?.airport) params.append('airport', filters.airport);
      if (filters?.flight) params.append('flight', filters.flight);

      const response = await axios.get(`${this.supabaseUrl}/functions/v1/signals?${params.toString()}`, {
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
      const response = await axios.get(`${this.supabaseUrl}/functions/v1/airports`, {
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
      const response = await axios.get(`${this.supabaseUrl}/functions/v1/airports/search`, {
        params: { q: query },
        headers: this.getHeaders()
      });
      
      return response.data;
    } catch (error) {
      console.error('Error searching airports:', error);
      return [];
    }
  }

  async getUserSignals(): Promise<Signal[]> {
    if (!this.token) return [];

    try {
      const response = await axios.get(`${this.supabaseUrl}/functions/v1/signals/my`, {
        headers: this.getHeaders()
      });
      
      return response.data;
    } catch (error) {
      console.error('Error getting user signals:', error);
      return [];
    }
  }

  async deleteSignal(signalId: string): Promise<boolean> {
    if (!this.token) return false;

    try {
      const response = await axios.delete(`${this.supabaseUrl}/functions/v1/signals/${signalId}`, {
        headers: this.getHeaders()
      });
      
      return response.status === 200;
    } catch (error) {
      console.error('Error deleting signal:', error);
      return false;
    }
  }
} 