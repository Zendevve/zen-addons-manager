import { ComponentFixture, TestBed } from '@angular/core/testing';

import { Manage } from './manage';

describe('Manage', () => {
  let component: Manage;
  let fixture: ComponentFixture<Manage>;

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      imports: [Manage]
    })
    .compileComponents();

    fixture = TestBed.createComponent(Manage);
    component = fixture.componentInstance;
    await fixture.whenStable();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });
});
