import { ComponentFixture, TestBed } from '@angular/core/testing';

import { Browse } from './browse';

describe('Browse', () => {
  let component: Browse;
  let fixture: ComponentFixture<Browse>;

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      imports: [Browse]
    })
    .compileComponents();

    fixture = TestBed.createComponent(Browse);
    component = fixture.componentInstance;
    await fixture.whenStable();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });
});
