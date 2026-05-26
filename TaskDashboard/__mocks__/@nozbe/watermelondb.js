// Mock manual completo para simular WatermelonDB sin conexión a SQLite real

class MockModel {
  constructor() {
    this.id = Math.random().toString();
  }
  
  // record.update() llama al callback para simular escritura local
  update(callback) {
    callback(this);
    return Promise.resolve(this);
  }
  
  prepareUpdate(callback) {
    callback(this);
    return this;
  }
}

class MockQuery {
  // collection.query().fetch() retorna arreglo vacío por defecto
  fetch() {
    return Promise.resolve([]);
  }
  fetchCount() {
    return Promise.resolve(0);
  }
  observe() {
    return {
      subscribe: (callbacks) => {
        callbacks.next([]);
        return { unsubscribe: jest.fn() };
      }
    };
  }
}

class MockCollection {
  constructor(table) {
    this.table = table;
    this.mockQuery = new MockQuery();
  }
  query() {
    return this.mockQuery;
  }
  find(id) {
    return Promise.resolve(new MockModel());
  }
  prepareCreate(callback) {
    const model = new MockModel();
    callback(model);
    return model;
  }
}

class MockDatabase {
  constructor() {
    this.collectionRegistry = {};
    this.collections = {
      get: jest.fn((table) => {
        if (!this.collectionRegistry[table]) {
          this.collectionRegistry[table] = new MockCollection(table);
        }
        return this.collectionRegistry[table];
      }),
    };
  }
  
  // database.write() ejecuta inmediatamente el callback pasado como transacción
  write(callback) {
    return callback();
  }
  
  batch(...records) {
    return Promise.resolve();
  }
}

const Q = {
  where: jest.fn((field, val) => ({ type: 'where', field, val })),
  sortBy: jest.fn((field, dir) => ({ type: 'sortBy', field, dir })),
  desc: 'desc',
  asc: 'asc',
};

module.exports = {
  Model: MockModel,
  Database: MockDatabase,
  Q,
  appSchema: jest.fn(),
  tableSchema: jest.fn(),
};
