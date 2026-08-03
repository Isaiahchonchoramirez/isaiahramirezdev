// PID control.
//
// The textbook three-line PID is not what flies. This one carries the three
// corrections that separate a controller that works in a slide from one that
// works on a vehicle: derivative on measurement, conditional integration, and
// an explicit output range that the integrator knows about.

import { clamp, lowPass } from '../engine/math.js';

export class Pid {
  constructor(options = {}) {
    this.kp = options.kp ?? 1;
    this.ki = options.ki ?? 0;
    this.kd = options.kd ?? 0;

    this.outMin = options.outMin ?? -Infinity;
    this.outMax = options.outMax ?? Infinity;

    // Cap on the integral term's own contribution, separate from the output
    // limit. Lets a controller keep a little steady-state authority without
    // letting the integrator own the whole actuator.
    this.integralLimit = options.integralLimit ?? Infinity;

    // Time constant on the derivative path. A raw derivative differentiates
    // sensor noise, and on a real vehicle that is the term that makes the
    // actuator chatter.
    this.derivativeTau = options.derivativeTau ?? 0.02;

    this.reset();
  }

  reset() {
    this.integral = 0;
    this.lastMeasurement = null;
    this.derivative = 0;
    this.p = 0;
    this.i = 0;
    this.d = 0;
    this.output = 0;
    this.saturated = false;
  }

  set(kp, ki, kd) {
    this.kp = kp;
    this.ki = ki;
    this.kd = kd;
  }

  update(setpoint, measurement, dt) {
    const error = setpoint - measurement;

    // Derivative on measurement, not on error. Differentiating the error makes
    // a step change in setpoint produce an unbounded spike — the "derivative
    // kick" that slams a gimbal to its stop the instant a new target arrives.
    // The measurement cannot step, so this term stays finite.
    if (this.lastMeasurement === null) this.lastMeasurement = measurement;
    const rawDerivative = (measurement - this.lastMeasurement) / dt;
    this.derivative = lowPass(this.derivative, rawDerivative, dt, this.derivativeTau);
    this.lastMeasurement = measurement;

    this.p = this.kp * error;
    this.d = -this.kd * this.derivative;

    // Conditional integration. If the output is already pinned at a limit and
    // the error would push it further into that limit, integrating only builds
    // a charge that has to be unwound before the controller can respond at all
    // — the classic windup that turns a saturated descent into an overshoot.
    const unclamped = this.p + this.ki * this.integral + this.d;
    const pushingIntoLimit =
      (unclamped >= this.outMax && error > 0) || (unclamped <= this.outMin && error < 0);

    if (!pushingIntoLimit) {
      this.integral = clamp(
        this.integral + error * dt,
        -this.integralLimit / (this.ki || 1),
        this.integralLimit / (this.ki || 1),
      );
    }
    this.i = this.ki * this.integral;

    const sum = this.p + this.i + this.d;
    this.output = clamp(sum, this.outMin, this.outMax);
    this.saturated = sum !== this.output;
    return this.output;
  }

  // Diagnostic breakdown for the inspector — seeing which term is doing the
  // work is most of what tuning is.
  terms() {
    return { p: this.p, i: this.i, d: this.d, output: this.output, saturated: this.saturated };
  }
}

// Two PIDs in series: the outer loop's output becomes the inner loop's
// setpoint. Position -> attitude -> gimbal is exactly this shape, and running
// the inner loop faster than the outer is what keeps the two from fighting.
export class CascadedPid {
  constructor(outerOptions, innerOptions) {
    this.outer = new Pid(outerOptions);
    this.inner = new Pid(innerOptions);
  }

  update(outerSetpoint, outerMeasurement, innerMeasurement, dt) {
    const innerSetpoint = this.outer.update(outerSetpoint, outerMeasurement, dt);
    return this.inner.update(innerSetpoint, innerMeasurement, dt);
  }

  reset() {
    this.outer.reset();
    this.inner.reset();
  }
}

export default Pid;
