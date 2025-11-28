import { StatusBar } from 'expo-status-bar';
import React, { useState, useEffect } from 'react';
import {
  StyleSheet,
  Text,
  View,
  TextInput,
  TouchableOpacity,
  Alert,
  Platform,
  SafeAreaView,
} from 'react-native';
import { LinearGradient } from 'expo-linear-gradient';
import { auth } from './firebase';
import { createUserWithEmailAndPassword, signInWithEmailAndPassword, signOut } from 'firebase/auth';
import { CameraView, CameraType, useCameraPermissions } from 'expo-camera';
import { BarcodeScanningResult } from 'expo-camera';
import 'react-native-gesture-handler';

export default function App() {
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [mensaje, setMensaje] = useState('');
  const [usuarioLogueado, setUsuarioLogueado] = useState(null);
  const [escaneando, setEscaneando] = useState(false);
  const [scanned, setScanned] = useState(false);
  const [permission, requestPermission] = useCameraPermissions();

  const mostrarAlerta = (titulo, mensaje) => {
    if (Platform.OS === 'web') {
      alert(`${titulo}: ${mensaje}`);
    } else {
      Alert.alert(titulo, mensaje);
    }
  };

  const validarEmail = (email) => {
    const regex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    return regex.test(email);
  };

  const registrarUsuario = () => {
    if (email.trim() === '' || password.trim() === '') {
      return mostrarAlerta('Error', 'Por favor, ingresa email y contraseña.');
    }

    if (!validarEmail(email)) {
      return mostrarAlerta('Error', 'Por favor, ingresa un email válido.');
    }

    if (password.length < 6) {
      return mostrarAlerta('Error', 'La contraseña debe tener al menos 6 caracteres.');
    }

    createUserWithEmailAndPassword(auth, email, password)
      .then((userCredential) => {
        const user = userCredential.user;
        setUsuarioLogueado(user);
        setMensaje(`Usuario creado: ${user.email}`);
        mostrarAlerta('Éxito', 'Usuario registrado correctamente');
        limpiarCampos();
      })
      .catch((error) => {
        let mensajeError = 'Error al registrar usuario';
        switch (error.code) {
          case 'auth/email-already-in-use':
            mensajeError = 'El email ya está en uso';
            break;
          case 'auth/invalid-email':
            mensajeError = 'Email inválido';
            break;
          case 'auth/weak-password':
            mensajeError = 'La contraseña es muy débil';
            break;
          default:
            mensajeError = error.message;
        }
        setMensaje(mensajeError);
        mostrarAlerta('Error', mensajeError);
      });
  };

  const iniciarSesion = () => {
    if (email.trim() === '' || password.trim() === '') {
      return mostrarAlerta('Error', 'Por favor, ingresa email y contraseña.');
    }

    if (!validarEmail(email)) {
      return mostrarAlerta('Error', 'Por favor, ingresa un email válido.');
    }

    signInWithEmailAndPassword(auth, email, password)
      .then((userCredential) => {
        const user = userCredential.user;
        setUsuarioLogueado(user);
        setMensaje(`Bienvenido: ${user.email}`);
        mostrarAlerta('Éxito', 'Inicio de sesión exitoso');
        limpiarCampos();
      })
      .catch((error) => {
        let mensajeError = 'Error al iniciar sesión';
        switch (error.code) {
          case 'auth/user-not-found':
            mensajeError = 'Usuario no encontrado';
            break;
          case 'auth/wrong-password':
            mensajeError = 'Contraseña incorrecta';
            break;
          case 'auth/invalid-email':
            mensajeError = 'Email inválido';
            break;
          default:
            mensajeError = error.message;
        }
        setMensaje(mensajeError);
        mostrarAlerta('Error', mensajeError);
      });
  };

  const cerrarSesion = () => {
    signOut(auth)
      .then(() => {
        setUsuarioLogueado(null);
        setEscaneando(false);
        setMensaje('Sesión cerrada correctamente');
        mostrarAlerta('Info', 'Sesión cerrada');
      })
      .catch((error) => {
        setMensaje('Error al cerrar sesión');
        mostrarAlerta('Error', 'Error al cerrar sesión');
      });
  };

  const limpiarCampos = () => {
    setEmail('');
    setPassword('');
  };

  const iniciarEscaneoQR = async () => {
    if (!permission) {
      // Los permisos aún no están cargados
      return;
    }

    if (!permission.granted) {
      // Solicitar permisos si no los tiene
      const { granted } = await requestPermission();
      if (!granted) {
        mostrarAlerta('Permisos requeridos', 'Se necesitan permisos de cámara para escanear QR');
        return;
      }
    }

    // Si ya tiene permisos, abrir la cámara
    setEscaneando(true);
    setScanned(false);
  };

  const manejarEscaneoQR = ({ type, data }: BarcodeScanningResult) => {
    setScanned(true);
    mostrarAlerta('QR Escaneado', `Tipo: ${type}\nDatos: ${data}`);
    // Puedes procesar los datos del QR aquí
    console.log(`QR escaneado - Tipo: ${type}, Datos: ${data}`);
    
    // Opcional: cerrar la cámara después de escanear
    setTimeout(() => {
      setEscaneando(false);
    }, 2000);
  };

  const cerrarCamara = () => {
    setEscaneando(false);
    setScanned(false);
  };

  // Pantalla de escaneo de QR
  if (escaneando) {
    return (
      <LinearGradient colors={['#2629d8ff', '#ffffffff', '#2629d8ff']} style={{ flex: 1 }}>
        <SafeAreaView style={estilos.contenedorPrincipal}>
          <Text style={[estilos.titulo, { fontSize: 30 }]}>Escanear QR</Text>
          
          <View style={estilos.contenedorCamara}>
            <CameraView
              style={estilos.camara}
              facing="back"
              onBarcodeScanned={scanned ? undefined : manejarEscaneoQR}
              barcodeScannerSettings={{
                barcodeTypes: ["qr"],
              }}
            />
          </View>

          <Text style={estilos.instrucciones}>
            Apunta la cámara hacia un código QR
          </Text>

          <View style={estilos.contenedorBotonesCamara}>
            <TouchableOpacity onPress={cerrarCamara} style={[estilos.boton, estilos.botonCerrar]}>
              <Text style={estilos.textoBoton}>Cerrar Cámara</Text>
            </TouchableOpacity>
          </View>

          <StatusBar style="auto" />
        </SafeAreaView>
      </LinearGradient>
    );
  }

  // Si el usuario está logueado, mostrar pantalla de bienvenida
  if (usuarioLogueado) {
    return (
      <LinearGradient colors={['#2629d8ff', '#ffffffff', '#2629d8ff']} style={{ flex: 1 }}>
        <SafeAreaView style={estilos.contenedorPrincipal}>
          <Text style={[estilos.titulo, { fontSize: 40 }]}>¡Bienvenido!</Text>
          
          <Text style={estilos.subtitulo}>
            Has iniciado sesión correctamente
          </Text>

          <Text style={estilos.emailUsuario}>
            {usuarioLogueado.email}
          </Text>

          <TouchableOpacity onPress={iniciarEscaneoQR} style={[estilos.boton, estilos.botonEscanear]}>
            <Text style={estilos.textoBoton}>Escanear QR</Text>
          </TouchableOpacity>

          <TouchableOpacity onPress={cerrarSesion} style={[estilos.boton, estilos.botonCerrar]}>
            <Text style={estilos.textoBoton}>Cerrar Sesión</Text>
          </TouchableOpacity>

          <StatusBar style="auto" />
        </SafeAreaView>
      </LinearGradient>
    );
  }

  // Pantalla de login/registro
  return (
    <LinearGradient colors={['#2629d8ff', '#ffffffff', '#2629d8ff']} style={{ flex: 1 }}>
      <SafeAreaView style={estilos.contenedorPrincipal}>
        <Text style={[estilos.titulo, { fontSize: 40 }]}>Inicio de Sesión</Text>
        <Text style={estilos.subtitulo}>
          Ingresa tus datos para registrarte o iniciar sesión
        </Text>

        <TextInput
          style={estilos.campo}
          placeholder="Email (ej. usuario@correo.com)"
          keyboardType="email-address"
          autoCapitalize="none"
          value={email}
          onChangeText={setEmail}
        />

        <TextInput
          style={estilos.campo}
          placeholder="Contraseña (mínimo 6 caracteres)"
          secureTextEntry
          value={password}
          onChangeText={setPassword}
        />

        <View style={estilos.contenedorBotones}>
          <TouchableOpacity onPress={registrarUsuario} style={[estilos.boton, estilos.botonRegistrar]}>
            <Text style={estilos.textoBoton}>Registrarse</Text>
          </TouchableOpacity>

          <TouchableOpacity onPress={iniciarSesion} style={[estilos.boton, estilos.botonLogin]}>
            <Text style={estilos.textoBoton}>Iniciar Sesión</Text>
          </TouchableOpacity>
        </View>

        {mensaje ? (
          <Text style={estilos.mensaje}>{mensaje}</Text>
        ) : null}

        <StatusBar style="auto" />
      </SafeAreaView>
    </LinearGradient>
  );
}

const estilos = StyleSheet.create({
  contenedorPrincipal: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    paddingHorizontal: 20,
  },
  titulo: {
    fontWeight: 'bold',
    color: '#000',
    marginBottom: 10,
  },
  subtitulo: {
    textAlign: 'center',
    marginBottom: 30,
    fontSize: 16,
  },
  campo: {
    width: '80%',
    borderWidth: 1,
    borderColor: '#000',
    borderRadius: 10,
    padding: 15,
    marginBottom: 15,
    backgroundColor: '#fff',
    fontSize: 16,
  },
  contenedorBotones: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    width: '80%',
    marginTop: 10,
  },
  boton: {
    paddingVertical: 15,
    paddingHorizontal: 20,
    borderRadius: 10,
    minWidth: 120,
    alignItems: 'center',
    marginVertical: 5,
  },
  botonRegistrar: {
    backgroundColor: '#4CAF50',
  },
  botonLogin: {
    backgroundColor: '#2196F3',
  },
  botonEscanear: {
    backgroundColor: '#FF9800',
    paddingVertical: 15,
    paddingHorizontal: 40,
    borderRadius: 10,
  },
  botonCerrar: {
    backgroundColor: '#f44336',
    paddingVertical: 15,
    paddingHorizontal: 40,
    borderRadius: 10,
  },
  textoBoton: {
    color: '#fff',
    fontWeight: 'bold',
    fontSize: 16,
  },
  mensaje: {
    marginTop: 20,
    fontSize: 16,
    textAlign: 'center',
    paddingHorizontal: 20,
    color: '#333',
  },
  emailUsuario: {
    fontSize: 18,
    fontWeight: 'bold',
    marginVertical: 10,
    color: '#000',
  },
  contenedorCamara: {
    width: 300,
    height: 300,
    overflow: 'hidden',
    borderRadius: 15,
    marginVertical: 20,
  },
  camara: {
    flex: 1,
  },
  instrucciones: {
    fontSize: 16,
    textAlign: 'center',
    marginBottom: 20,
    color: '#333',
  },
  contenedorBotonesCamara: {
    width: '80%',
    alignItems: 'center',
  },
});