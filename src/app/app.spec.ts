import { TestBed } from '@angular/core/testing';
import { provideRouter } from '@angular/router';
import { App } from './app';
import { validarCedula } from './core/util';

describe('App', () => {
  beforeEach(async () => {
    await TestBed.configureTestingModule({
      imports: [App],
      providers: [provideRouter([])],
    }).compileComponents();
  });

  it('should create the app', () => {
    const fixture = TestBed.createComponent(App);
    expect(fixture.componentInstance).toBeTruthy();
  });
});

describe('validarCedula', () => {
  it('rechaza cédulas con largo incorrecto o letras', () => {
    expect(validarCedula('12345')).toBe(false);
    expect(validarCedula('17a0000000')).toBe(false);
  });

  it('acepta una cédula con dígito verificador correcto', () => {
    expect(validarCedula('1710034065')).toBe(true);
  });

  it('rechaza una cédula con dígito verificador incorrecto', () => {
    expect(validarCedula('1710034064')).toBe(false);
  });
});
