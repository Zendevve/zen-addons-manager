import { TestBed } from '@angular/core/testing';

import { Addon } from './addon';

describe('Addon', () => {
  let service: Addon;

  beforeEach(() => {
    TestBed.configureTestingModule({});
    service = TestBed.inject(Addon);
  });

  it('should be created', () => {
    expect(service).toBeTruthy();
  });
});
