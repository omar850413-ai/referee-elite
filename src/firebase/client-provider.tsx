
"use client";

import { useEffect, useState } from "react";
import { FirebaseApp, initializeApp } from "firebase/app";
import { Auth, getAuth } from "firebase/auth";
import { Firestore, getFirestore } from "firebase/firestore";
import { FirebaseProvider } from "./provider";
import firebaseConfig from "./config";

let firebaseApp: FirebaseApp | null = null;
let auth: Auth | null = null;
let firestore: Firestore | null = null;

function getFirebaseInstances() {
  if (typeof window !== "undefined") {
    if (!firebaseApp) {
      firebaseApp = initializeApp(firebaseConfig);
      auth = getAuth(firebaseApp);
      firestore = getFirestore(firebaseApp);
    }
    return { firebaseApp, auth, firestore };
  }
  return { firebaseApp: null, auth: null, firestore: null };
}

export function FirebaseClientProvider({
  children,
}: {
  children: React.ReactNode;
}) {
  const [{ firebaseApp, auth, firestore }, setFirebase] = useState(
    getFirebaseInstances()
  );

  useEffect(() => {
    if (!firebaseApp) {
      setFirebase(getFirebaseInstances());
    }
  }, [firebaseApp]);

  if (!firebaseApp || !auth || !firestore) {
    return null; // or a loading indicator
  }

  return (
    <FirebaseProvider firebaseApp={firebaseApp} auth={auth} firestore={firestore}>
      {children}
    </FirebaseProvider>
  );
}
