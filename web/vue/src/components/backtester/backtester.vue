<template lang='jade'>
  div
    h2.contain Backtest
    .hr.contain
    config-builder(v-on:config='check')
    div(v-if='backtestable')
      .txt--center
        a.w100--s.my1.btn--primary(href='#', v-if='backtestState !== "fetching"', v-on:click.prevent='run') Backtest
        div(v-if='backtestState === "fetching"').scan-btn
          p Running backtest..
          spinner
    result(v-if='backtestResult && backtestState === "fetched"', :result='backtestResult')
    bruteForceResults(v-if='topResultsByProfit && bruteForceResultState === "newResult"', :topResultsByProfit='topResultsByProfit', :bruteForcedResultsCount='bruteForcedResultsCount', :bruteForceCombinationsCount='bruteForceCombinationsCount')
</template>

<script>
import configBuilder from './backtestConfigBuilder.vue'
import result from './result/result.vue'
import bruteForceResults from './result/bruteForceResults.vue'
import { post } from '../../tools/ajax'
import spinner from '../global/blockSpinner.vue'

export default {
  data: () => {
    return {
      backtestable: false,
      backtestState: 'idle',
      backtestResult: false,
      bruteForcedResultsCount: "0",
      bruteForceCombinationsCount: "0",
      topResults: { min: undefined, max: undefined },
      topResultsByProfit: [],
      bruteForceResults: [],
      config: false,
    }
  },
  methods: {
    check: function(config) {
      this.config = config;

      if(!config.valid)
        return this.backtestable = false;

      this.backtestable = true;
    },
    getReport: function(next, resetFetchingState) {
      const self = this;
      if (!resetFetchingState) { resetFetchingState = true; }
      if (resetFetchingState) {
        this.backtestState = 'fetching';
      }
      const req = {
        gekkoConfig: this.config,
        data: {
          candleProps: ['close', 'start'],
          indicatorResults: true,
          report: true,
          roundtrips: true,
          trades: true
        }
      }
      if (next) {
        return post('backtest', req, (error, response) => {
          self.bruteForceResultState = 'newResult';
          self.backtestState = 'fetched';
          self.bruteForcedResultsCount = (parseInt(self.bruteForcedResultsCount)+1).toString();
          if (response.report.profit < self.topResults.min || typeof(self.topResults.min == 'undefined')) {
            this.topResults.min = response.report.profit;
          }
          if (response.report.profit > self.topResults.max || typeof(self.topResults.max == 'undefined')) {
            // Keep top 10 results by profit
            self.topResults.max = response.report.profit;
            Object.assign(response, { params: self.config[self.config.tradingAdvisor.method] });
            self.topResultsByProfit.push(response);
            self.topResultsByProfit.sort(function(a,b) {
              return (a.report.profit < b.report.profit) ? 1 : ((b.report.profit < a.report.profit) ? -1 : 0);
            });
            self.topResultsByProfit = self.topResultsByProfit.slice(0, 10);
          }
          // Keep all results in order
          // self.bruteForceResults.push(response);
          next(error, response);
        });
      } else {
        return post('backtest', req, (error, response) => {
          self.backtestState = 'fetched';
          self.backtestResult = response;
        });
      }
    },
    getReports: function(bruteforceParamsPermutations, i) {
      const self = this;
      if (!i) { i = 0; }
      while (i < bruteforceParamsPermutations.length) {
        console.log(' + Testing strategy with params: ', bruteforceParamsPermutations[i]['params']);
        // Prepare config using a permuted params combination
        this.config[this.config.tradingAdvisor.method] = bruteforceParamsPermutations[i]['params'];
        return (function(i) {
          i++;
          self.getReport((err, response) => {
            if (!err) {
              self.getReports(bruteforceParamsPermutations, i);
            }
          }, false);
        })(i);
      }
    },
    run: function() {
      // Are we brute forcing the strategy params?
      if (window.bruteForcer && window.bruteForcer.isConfigured()) {
        this.bruteForceCombinationsCount = window.bruteForcer.config.bruteforceParamsPermutations.length.toString();
        this.getReports(window.bruteForcer.config.bruteforceParamsPermutations);
      } else {
      // Are we just testing a single set of params?
        this.getReport();
      }
    }
  },
  components: {
    configBuilder,
    result,
    bruteForceResults,
    spinner
  }
}
</script>

<style>
.contain {
  max-width: 900px;
  margin-left: auto;
  margin-right: auto;
}
</style>
