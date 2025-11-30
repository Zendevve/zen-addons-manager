import { TestBed } from '@angular/core/testing';

import { Electron } from './electron';

describe('Electron', () => {
  let service: Electron;

  beforeEach(() => {
    TestBed.configureTestingModule({});
    service = TestBed.inject(Electron);
  });

  it('should be created', () => {
    expect(service).toBeTruthy();
  });
});
