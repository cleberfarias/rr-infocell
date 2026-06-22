import { initializeApp, type FirebaseApp } from "firebase/app";
import { getAuth, type Auth } from "firebase/auth";

let _app: FirebaseApp | null = null;
let _auth: Auth | null = null;

function getFirebaseAuth(): Auth {
  if (_auth) return _auth;

  _app = initializeApp({
    apiKey: "AIzaSyB8BHL-HpHnNZYIyjasnTdP--Cl_yzAMVw",
    authDomain: "rr-infocell.firebaseapp.com",
    projectId: "rr-infocell",
  });

  _auth = getAuth(_app);
  return _auth;
}

export { getFirebaseAuth };
