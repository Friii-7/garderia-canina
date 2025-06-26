import { ApplicationConfig, provideZoneChangeDetection } from '@angular/core';
import { provideRouter, withHashLocation } from '@angular/router';
import { provideFirebaseApp, initializeApp } from '@angular/fire/app';
import { provideFirestore, getFirestore } from '@angular/fire/firestore';

import { routes } from './app.routes';


const firebaseConfig = {
  apiKey: "AIzaSyAedFfQYGQk9QtowikH4bbX1JApHxD_d58",
  authDomain: "guarderia-canina-695cb.firebaseapp.com",
  projectId: "guarderia-canina-695cb",
  storageBucket: "guarderia-canina-695cb.firebasestorage.app",
  messagingSenderId: "1088551370005",
  appId: "1:1088551370005:web:5b2307b91ab4ea4068fd1c",
  measurementId: "G-822CWMJ6RD"
};

export const appConfig: ApplicationConfig = {
  providers: [
    provideZoneChangeDetection({ eventCoalescing: true }),
    provideRouter(routes, withHashLocation()),
    provideFirebaseApp(() => initializeApp(firebaseConfig)),
    provideFirestore(() => getFirestore())
  ]
};
