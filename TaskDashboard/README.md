# TaskDashboard

![React Native](https://img.shields.io/badge/React_Native-20232A?style=for-the-badge&logo=react&logoColor=61DAFB)
![TypeScript](https://img.shields.io/badge/TypeScript-007ACC?style=for-the-badge&logo=typescript&logoColor=white)
![WatermelonDB](https://img.shields.io/badge/WatermelonDB-FF4C4C?style=for-the-badge&logo=sqlite&logoColor=white)
![Zustand](https://img.shields.io/badge/Zustand-4D4D4D?style=for-the-badge&logo=react&logoColor=white)
![Kotlin](https://img.shields.io/badge/Kotlin-0095D5?style=for-the-badge&logo=kotlin&logoColor=white)

TaskDashboard es una aplicación móvil de gestión de tareas diseñada con un enfoque de arquitectura **Offline-First**. Permite a los usuarios visualizar, filtrar y marcar tareas como completadas de forma inmediata, incluso sin conexión a internet, sincronizando los datos en segundo plano cuando la red está disponible.

IMPORTANTE: En el arranque inicial de la aplicación se realiza una sincronización contra `https://dummyjson.com/todos` para poblar la base de datos local (WatermelonDB). La UI siempre lee desde la base local; el mecanismo "pull-to-refresh" solicita datos a la API y actualiza la base local (Offline→Local).

---

## Stack Tecnológico

| Tecnología | Rol en el proyecto |
| :--- | :--- |
| **React Native CLI** | Framework de UI principal. Se prefirió sobre Expo para tener control total sobre el puente nativo y compilar módulos personalizados en Kotlin (AvatarView). |
| **TypeScript** | Lenguaje estricto configurado en toda la base del código para evitar errores en tiempo de ejecución y mejorar la mantenibilidad a través de tipados fuertemente acoplados. |
| **WatermelonDB** | Base de datos local ultra rápida basada en SQLite. Se eligió por su excepcional manejo de reactividad en listas largas y su modelo de concurrencia optimizado para mantener 60 FPS. |
| **Zustand** | Manejador de estado global para guardar la información de sincronización y los filtros de la UI, más ligero, directo y libre de boilerplate en comparación a Redux. |
| **React Navigation** | Enrutador de estándar industrial (@react-navigation/stack) para el manejo ordenado de pantallas y flujos de navegación nativos. |
| **Axios** | Cliente HTTP robusto utilizado para fetch y sincronización, con soporte indispensable para interceptores, transformadores de errores, y timeouts de API. |

---

## Arquitectura Offline-First

TaskDashboard está construido bajo el estricto paradigma **Offline-First**. Esto significa que la interfaz de usuario (UI) **NUNCA** lee datos directamente desde la red. 

### ¿Por qué WatermelonDB?
WatermelonDB fue seleccionado por las siguientes razones técnicas concretas:
- Rendimiento: está diseñado para listas muy largas y mantiene la UI a ~60 FPS usando consultas perezosas y operaciones en background.
- Reactividad: expone observables que permiten que la UI se actualice inmediatamente cuando cambian los modelos, sin reconsultas manuales.
- Concurrencia y batching: permite operaciones en lote (`prepareCreate`, `prepareUpdate`, `database.batch`) sin bloquear el hilo de JS, crucial para sincronizaciones masivas.
- Persistencia segura: usa SQLite por debajo y ofrece un modelo transaccional estable para evitar corrupciones en escenarios offline.

Estas características hacen de WatermelonDB una elección óptima para apps móviles que requieran:
- Respuesta inmediata en UI (optimistic updates)
- Sincronizaciones incrementales/masivas sin impactar el rendimiento
- Observabilidad fine-grained que reduce re-renders innecesarios

### Flujo de Sincronización (Resumen operativo)
1. Al iniciar la app por primera vez, `useSync()` ejecuta una petición a `https://dummyjson.com/todos` y llama a `bulkUpsertTasks(...)` para persistir en WatermelonDB. Si no existe sesión activa, las tareas se asocian a un usuario por defecto interno (`id='1'`) para poblar la UI inicial.
2. La UI **lee únicamente desde WatermelonDB** mediante `useTasks()` (observables). No se muestran resultados directos de la API.
3. Cuando el usuario ejecuta "pull-to-refresh" o la app vuelve a primer plano, `syncTasks()` vuelve a consumir la API y hace `bulkUpsert` en la DB local. Las colecciones observadas emiten los cambios y la UI se actualiza automáticamente.
4. Si la API falla, el sistema opera en modo offline mostrando la caché local y un banner informativo; la sincronización reintentará según la política implementada en `useSync()`.

```text
 +---------+      (1) Fetch API      +-------------+
 |         | ----------------------> |             |
 |   API   |                         |   useSync   |
 |         | <---------------------- |             |
 +---------+        (2) JSON         +-------------+
                                           |
                                           | (3) bulkUpsert()
                                           v
 +---------+      (5) Observe()      +-------------+
 |         | <---------------------- |             |
 |   UI    |                         | WatermelonDB|
 |         | ----------------------> |   (SQLite)  |
 +---------+      (4) Local Update   +-------------+
```

### Comportamiento Offline Sólido
Si el dispositivo pierde conexión por completo, la aplicación ni se inmuta. Sigue funcionando al 100% leyendo la caché local persistida por WatermelonDB. Únicamente se mostrará de forma animada un pequeño "banner de advertencia" avisando al usuario que está en modo sin conexión para garantizar transparencia.

---

## Instalación y Ejecución

Sigue estos pasos para levantar el entorno de desarrollo y probar el proyecto:

### Requisitos Previos
Asegúrate de contar con el entorno de Android funcional:
- **Node.js** (v18+)
- **Java Development Kit (JDK)** 17
- **Android Studio** (con SDK Android configurado e instalado)

### Instrucciones Paso a Paso

1. **Clonar el repositorio:**
   ```bash
   git clone <url-del-repo>
   cd TaskDashboard
   ```

2. **Instalar dependencias NPM:**
   ```bash
   npm install
   ```

3. **Configuración de Variables de Entorno (Android):**
   Asegúrate de tener definidas estas variables de entorno en Windows, Mac (`~/.zshrc`) o Linux (`~/.bashrc`):
   ```bash
   export ANDROID_HOME=$HOME/Library/Android/sdk
   export PATH=$PATH:$ANDROID_HOME/emulator
   export PATH=$PATH:$ANDROID_HOME/platform-tools
   ```

4. **Iniciar el emulador de Android:**
   Abre Android Studio, navega al *Device Manager* y lanza tu dispositivo virtual favorito, o bien lánzalo desde terminal:
   ```bash
   emulator -avd <Nombre_Emulador>
   ```

5. **Compilar y Ejecutar React Native:**
   Ejecuta el proyecto nativo forzando el armado del código Android:
   ```bash
   npx react-native run-android
   ```

---

## Configuración Nativa (AvatarView en Kotlin)

El proyecto demuestra destreza nativa implementando el módulo **`AvatarView`** renderizado completamente a nivel GPU en Android a través de **Kotlin**.

- **Registro del ViewManager:** La vista de layout se procesó dentro de `AvatarViewManager.kt` utilizando la anotación experta `@ReactModule` y asociando setters de propiedades JS con `@ReactProp(name = "name")`. Para acoplarse con la red de JS, el paquete puente `AvatarViewPackage()` se inyectó en el método `getPackages()` del archivo `MainApplication.kt`.
- **Compilación Obligatoria:** Cuando se realizan modificaciones en el puente Kotlin, el bundler JS de Metro no es suficiente, debe recompilarse la app nativa:
  ```bash
  cd android && ./gradlew clean && cd ..
  npx react-native run-android
  ```

---

## Estructura de Carpetas

```text
TaskDashboard/
├── android/                 # Raíz y configuración del proyecto para Android (Gradle, Kotlin)
│   └── app/src/main/.../com/taskdashboard/ # Módulo nativo (AvatarView)
├── ios/                     # Raíz de código nativo para entorno iOS
├── src/
│   ├── api/                 # Config Axios e interceptores HTTP (tasksApi.ts)
│   ├── components/          # Componentes reusables de alto nivel (TaskItem, FilterBar, AvatarView)
│   ├── database/            # Conexión, Schema, Modelos (WatermelonDB) y Repositorio 
│   ├── hooks/               # Custom Hooks (useSync, useTasks reactivos)
│   ├── navigation/          # React Navigation Stack principal (AppNavigator)
│   ├── screens/             # Vistas padre (DashboardScreen de Alta Virtualización)
│   ├── store/               # Zustand global store con inmutabilidad (taskStore)
│   ├── theme/               # Tokens de Diseño (modo Dark/Light con Context)
│   └── utils/               # Utilidades puras JS (colorGenerator.ts)
├── __mocks__/               # Mock Manual robusto simulando SQLite nativo
├── __tests__/               # Pruebas automatizadas rigurosas bajo métrica AAA
├── App.tsx                  # Root Point integrador de Providers
├── jest.config.js           # Orquestación y mapeo para Jest testing de entorno
└── package.json             # Manifiesto de librerías
```

---

## Uso de IA

Durante el desarrollo de **TaskDashboard**, se implementó una estrategia avanzada de asistencia con herramientas de Inteligencia Artificial para acelerar tareas complejas y optimizar el rendimiento, siempre bajo estricta supervisión y control humano:

### 1. Estrategia Multi-Modelo y Transición por Cuota
El diseño y la resolución de problemas nativos de la aplicación se apoyó en un flujo de trabajo adaptativo entre diferentes modelos de lenguaje:
* **Fase Inicial (Estructuración y Prompts):** Se utilizaron los modelos de **Gemini** para la ingeniería de prompts y la definición de la arquitectura de datos lógica.
* **Fase Intermedia (Desarrollo Avanzado):** Se integraron modelos de alta capacidad disponibles de forma gratuita en la plataforma **Antigravity** (como *Anthropic Claude 3 Opus* y *Gemini*) para la lógica compleja de persistencia. 
* **Fase de Continuidad (IA de VS Code):** Al agotarse la cuota de tokens en la plataforma anterior, se realizó una transición directa hacia la **extensión de IA integrada en VS Code** para mantener la continuidad del código y finalizar los ajustes de las pantallas nativas sin interrupciones.
* **Fase de Diagnóstico (ChatGPT):** Se utilizó **ChatGPT** de forma externa como una herramienta especializada en *debugging*, consulta técnica y lectura de logs de error complejos del entorno Android.

### 2. Áreas de Aplicación Técnica
* **Estructuración de Código Base y Tipado:** Generación inicial de boilerplate (configuración de pruebas, firmas de tipos estrictos en TypeScript y esquemas reactivos para la base de datos *Offline-First* con **WatermelonDB**).
* **Optimización de Rendimiento:** Implementación de propuestas de optimización de queries, batching, memoización de componentes (`React.memo`) y uso de `useCallback` para mitigar el retraso de renderizado en las listas de tareas.
* **Infraestructura Nativa y Automatización:** Corrección rápida de dependencias rotas y reconfiguración de los scripts de Gradle (`build.gradle`) para la firma criptográfica digital en modo *Release*.

### 3. Control Humano y Responsabilidad Técnica
* **Auditoría de Código:** Todas las modificaciones propuestas por los diferentes modelos de IA fueron revisadas, validadas y corregidas manualmente por el aprendiz antes de ser aplicadas al repositorio local o confirmadas en los archivos de configuración (`gradle.properties`).
* **Decisiones Arquitectónicas:** Las directrices críticas del proyecto (enfoque *Offline-First*, diseño de las tablas de la base de datos local SQLite y la política de sincronización con el backend *SenaVicola*) fueron definidas y aprobadas exclusivamente por el criterio humano.
* **Seguridad:** Se evitó expresamente incluir claves privadas, tokens de acceso o variables de entorno confidenciales en los contextos de los asistentes de IA, manteniendo la integridad del software.

---

## Decisiones Técnicas

- **React Native CLI sobre Expo:** Optar por CLI pura da completo e irrestricto poder sobre los archivos nativos. Para los requerimientos de la prueba, implementar `AvatarView` inyectando puentes y manejadores en `MainApplication` era indispensable, escenario donde Expo Go o EAS limitan en fases de rápido prototipado.
- **Zustand sobre Redux:** Redux implica un boilerplate enorme para aplicaciones móviles modernas. Con Zustand (`immer` middleware), obtenemos exactamente las mismas promesas de inmutabilidad y predictibilidad, pero en fracciones del código, y la selección optimizada mediante hooks directos.
- **WatermelonDB sobre Realm:** Aunque Realm es poderoso, requiere atarse con dureza a su capa C++. WatermelonDB es pragmático y usa SQLite por debajo con asincronía obligatoria. Para un componente crítico como la FlatList, Watermelon devuelve Observables (RxJS-like) con los que la vista responde instántaneamente en el subproceso de UI, dándole prioridad absoluta a los ansiados 60 FPS.

---

## Pruebas Automatizadas y Calidad

El proyecto tiene una infraestructura de validación de tests estructurada bajo el estándar **AAA (Arrange, Act, Assert)** usando `Jest` y React Native Testing Library.

Para disparar todas las validaciones asiladas que simulan Watermelon y Zustand ejecutamos:
```bash
npm test
```

Para validar el Coverage general del proyecto local (que cuenta con un Threshold mínimo obligatorio del **80%** en todo el entorno), ejecuta:
```bash
npm test -- --coverage
```
