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
  Linking,
  Clipboard,
} from 'react-native';
import { LinearGradient } from 'expo-linear-gradient';
import { auth } from './firebase';
import { createUserWithEmailAndPassword, signInWithEmailAndPassword, signOut } from 'firebase/auth';
import { CameraView, useCameraPermissions } from 'expo-camera';
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
  const [historialQR, setHistorialQR] = useState([]);
  const [qrDatos, setQrDatos] = useState(null);

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
        setHistorialQR([]);
        setQrDatos(null);
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
      return;
    }

    if (!permission.granted) {
      const { granted } = await requestPermission();
      if (!granted) {
        mostrarAlerta('Permisos requeridos', 'Se necesitan permisos de cámara para escanear QR');
        return;
      }
    }

    setEscaneando(true);
    setScanned(false);
    setQrDatos(null);
  };

  const interpretarQR = (data) => {
    try {
      // Detectar tipo de contenido QR
      let tipo = 'Texto';
      let accion = null;
      let contenido = data;

      // Detectar URL
      const urlRegex = /^(https?:\/\/)?([\da-z\.-]+)\.([a-z\.]{2,6})([\/\w \.-]*)*\/?$/;
      if (urlRegex.test(data.toLowerCase())) {
        tipo = 'URL';
        const urlCompleta = data.startsWith('http') ? data : `https://${data}`;
        accion = () => {
          Linking.canOpenURL(urlCompleta).then(supported => {
            if (supported) {
              Linking.openURL(urlCompleta);
            } else {
              mostrarAlerta('Error', 'No se puede abrir esta URL');
            }
          });
        };
      }
      
      // Detectar email
      else if (data.includes('@') && data.includes('.') && data.indexOf('@') < data.lastIndexOf('.')) {
        tipo = 'Email';
        if (!data.startsWith('mailto:')) {
          contenido = `mailto:${data}`;
        }
        accion = () => {
          Linking.openURL(contenido);
        };
      }
      
      // Detectar teléfono
      else if (/^[\+]?[1-9][\d]{0,15}$/.test(data.replace(/[\s\(\)\-]/g, ''))) {
        tipo = 'Teléfono';
        if (!data.startsWith('tel:')) {
          contenido = `tel:${data}`;
        }
        accion = () => {
          Linking.openURL(contenido);
        };
      }
      
      // Detectar WiFi
      else if (data.startsWith('WIFI:')) {
        tipo = 'WiFi';
        const wifiData = data.substring(5);
        const parametros = {};
        wifiData.split(';').forEach(param => {
          const [key, value] = param.split(':');
          if (key && value) {
            parametros[key.toLowerCase()] = value;
          }
        });
        contenido = `Red: ${parametros.s || 'Desconocida'}\nTipo: ${parametros.t || 'WPA'}`;
      }
      
      // Detectar VCard
      else if (data.startsWith('BEGIN:VCARD')) {
        tipo = 'Contacto (VCard)';
        const lineas = data.split('\n');
        const vcardData = {};
        lineas.forEach(linea => {
          if (linea.includes(':')) {
            const [key, value] = linea.split(':');
            if (key.includes('N')) vcardData.nombre = value;
            if (key.includes('TEL')) vcardData.telefono = value;
            if (key.includes('EMAIL')) vcardData.email = value;
          }
        });
        contenido = `Nombre: ${vcardData.nombre || 'No especificado'}\nTeléfono: ${vcardData.telefono || 'No especificado'}\nEmail: ${vcardData.email || 'No especificado'}`;
      }
      
      // Detectar ubicación geográfica
      else if (data.startsWith('geo:')) {
        tipo = 'Ubicación';
        const coordenadas = data.substring(4);
        accion = () => {
          Linking.openURL(data);
        };
      }
      
      // Detectar evento de calendario
      else if (data.startsWith('BEGIN:VEVENT')) {
        tipo = 'Evento';
      }

      return { tipo, contenido: data, accion, datosInterpretados: contenido };
    } catch (error) {
      console.error('Error interpretando QR:', error);
      return { tipo: 'Texto', contenido: data, accion: null, datosInterpretados: data };
    }
  };

  const manejarEscaneoQR = ({ type, data }: BarcodeScanningResult) => {
    if (scanned) return;
    
    setScanned(true);
    
    const resultado = interpretarQR(data);
    setQrDatos(resultado);
    
    // Agregar al historial
    const nuevoRegistro = {
      id: Date.now().toString(),
      datos: data,
      tipo: resultado.tipo,
      fecha: new Date().toLocaleString(),
      ...resultado
    };
    
    setHistorialQR(prev => [nuevoRegistro, ...prev.slice(0, 9)]); // Mantener últimos 10
    
    // Mostrar alerta con opciones
    mostrarOpcionesQR(resultado, data);
    
    console.log(`QR escaneado - Tipo: ${type}, Datos: ${data}, Interpretado como: ${resultado.tipo}`);
  };

  const mostrarOpcionesQR = (resultado, datosOriginales) => {
    const opciones = [
      {
        text: 'Copiar',
        onPress: () => {
          Clipboard.setString(datosOriginales);
          mostrarAlerta('Copiado', 'Texto copiado al portapapeles');
        }
      },
      {
        text: resultado.tipo === 'URL' ? 'Abrir en navegador' : 
              resultado.tipo === 'Email' ? 'Enviar email' :
              resultado.tipo === 'Teléfono' ? 'Llamar' :
              resultado.tipo === 'Ubicación' ? 'Abrir mapa' : 'Aceptar',
        onPress: () => {
          if (resultado.accion) {
            resultado.accion();
          }
        }
      },
      {
        text: 'Escanear otro',
        onPress: () => {
          setScanned(false);
          setQrDatos(null);
        }
      },
      {
        text: 'Cerrar',
        style: 'cancel'
      }
    ];

    Alert.alert(
      `QR Escaneado - ${resultado.tipo}`,
      resultado.datosInterpretados,
      opciones
    );
  };

  const copiarPortapapeles = (texto) => {
    Clipboard.setString(texto);
    mostrarAlerta('Copiado', 'Texto copiado al portapapeles');
  };

  const verHistorial = () => {
    if (historialQR.length === 0) {
      mostrarAlerta('Historial', 'No hay códigos QR escaneados');
      return;
    }

    const historialTexto = historialQR.map((item, index) => 
      `${index + 1}. [${item.tipo}] ${item.datos.substring(0, 30)}${item.datos.length > 30 ? '...' : ''}\n   ${item.fecha}`
    ).join('\n\n');

    Alert.alert(
      'Historial de QR',
      historialTexto,
      [
        { text: 'Limpiar historial', onPress: () => setHistorialQR([]) },
        { text: 'Cerrar', style: 'cancel' }
      ]
    );
  };

  const cerrarCamara = () => {
    setEscaneando(false);
    setScanned(false);
    setQrDatos(null);
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
                barcodeTypes: ["qr", "pdf417", "ean13", "ean8", "upc_a", "upc_e", "aztec", "codabar", "code39", "code93", "code128", "datamatrix", "itf14"],
              }}
            />
          </View>

          <Text style={estilos.instrucciones}>
            {scanned ? 'QR escaneado ✓' : 'Apunta la cámara hacia un código QR'}
          </Text>

          {qrDatos && (
            <View style={estilos.contenedorResultadoQR}>
              <Text style={estilos.tituloResultado}>Resultado:</Text>
              <Text style={estilos.tipoQR}>Tipo: {qrDatos.tipo}</Text>
              <Text style={estilos.datosQR} numberOfLines={3}>
                {qrDatos.datosInterpretados}
              </Text>
            </View>
          )}

          <View style={estilos.contenedorBotonesCamara}>
            <TouchableOpacity onPress={verHistorial} style={[estilos.boton, estilos.botonHistorial]}>
              <Text style={estilos.textoBoton}>Historial ({historialQR.length})</Text>
            </TouchableOpacity>
            
            {scanned && (
              <TouchableOpacity onPress={() => setScanned(false)} style={[estilos.boton, estilos.botonEscanear]}>
                <Text style={estilos.textoBoton}>Escanear otro</Text>
              </TouchableOpacity>
            )}
            
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

          {historialQR.length > 0 && (
            <TouchableOpacity onPress={verHistorial} style={[estilos.boton, estilos.botonHistorial]}>
              <Text style={estilos.textoBoton}>Ver Historial ({historialQR.length})</Text>
            </TouchableOpacity>
          )}

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
  botonHistorial: {
    backgroundColor: '#9C27B0',
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
    borderWidth: 2,
    borderColor: '#000',
  },
  camara: {
    flex: 1,
  },
  instrucciones: {
    fontSize: 16,
    textAlign: 'center',
    marginBottom: 10,
    color: '#333',
    fontWeight: 'bold',
  },
  contenedorBotonesCamara: {
    width: '80%',
    alignItems: 'center',
  },
  contenedorResultadoQR: {
    backgroundColor: 'rgba(255, 255, 255, 0.9)',
    padding: 15,
    borderRadius: 10,
    marginVertical: 10,
    width: '80%',
    borderWidth: 1,
    borderColor: '#ddd',
  },
  tituloResultado: {
    fontSize: 18,
    fontWeight: 'bold',
    marginBottom: 5,
    color: '#000',
  },
  tipoQR: {
    fontSize: 14,
    color: '#2196F3',
    marginBottom: 5,
    fontWeight: 'bold',
  },
  datosQR: {
    fontSize: 14,
    color: '#333',
  },
});