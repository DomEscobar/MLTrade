<template lang='jade'>
  div
    .hr.contain
    div.contain
      h3.top-10 Top 10 by profit
      div.count Tested {{ bruteForcedResultsCount }} of {{bruteForceCombinationsCount}} combinations
    div(v-for='topResult in topResultsByProfit')
      div.contain
        div.tested-params
          span(v-for="(paramValue, paramName) in topResult.params")
            span.param-name {{ paramName }}&nbsp;
            span.param-value {{ paramValue }}&nbsp;
      result-summary(:report='topResult.report')
</template>

<script>
import resultSummary from './summary.vue'
import chart from './chartWrapper.vue'
import roundtripTable from './roundtripTable.vue'

export default {
  props: ['bruteForcedResultsCount', 'bruteForceCombinationsCount', 'topResultsByProfit'],
  data: () => {
    return {}
  },
  methods: {},
  components: {
    roundtripTable,
    resultSummary,
    chart
  }
}
</script>

<style>
  .top-10 {
    font-weight: 600;
  }
  .top-10, .count {
    text-align: center;
  }
  .tested-params {
    text-align: center;
    border: 1px dashed rgba(144,144,144,.99);
    margin: 15px 0;
    padding: 5px;
  }
  .param-name {
    font-weight: 600;
  }
</style>
