import { DegradationRepository } from './degradation-repository.ts';
import { ForecastRepository } from './forecast-repository.ts';
import { PredictionRepository } from './prediction-repository.ts';
import { SimulationRepository } from './simulation-repository.ts';
import { TimelineRepository } from './timeline-repository.ts';

export class TemporalPersistence {
  timelines: TimelineRepository;
  forecasts: ForecastRepository;
  predictions: PredictionRepository;
  degradations: DegradationRepository;
  simulations: SimulationRepository;

  constructor() {
    this.timelines = new TimelineRepository();
    this.forecasts = new ForecastRepository();
    this.predictions = new PredictionRepository();
    this.degradations = new DegradationRepository();
    this.simulations = new SimulationRepository();
  }

  clear(): void {
    this.timelines = new TimelineRepository();
    this.forecasts = new ForecastRepository();
    this.predictions = new PredictionRepository();
    this.degradations = new DegradationRepository();
    this.simulations = new SimulationRepository();
  }
}
