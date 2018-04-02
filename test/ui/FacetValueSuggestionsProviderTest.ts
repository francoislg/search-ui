import { FacetValueSuggestionsProvider } from '../../src/ui/FacetValueSuggestions/FacetValueSuggestionsProvider';
import * as Mock from '../MockEnvironment';
import { IFieldOption } from '../../src/ui/Base/ComponentOptions';
import { QueryController, QueryStateModel, SearchEndpoint } from '../Test';
import { IIndexFieldValue } from '../../src/rest/FieldValue';
import { IListFieldValuesRequest } from '../../src/rest/ListFieldValuesRequest';

export function FacetValueSuggestionsProviderTest() {
  describe('FacetValueSuggestionsProvider', () => {
    let test: FacetValueSuggestionsProvider;
    let queryController: QueryController = Mock.mock(QueryController);
    let queryStateModel: QueryStateModel = Mock.mock(QueryStateModel);
    let searchEndpointMock: SearchEndpoint = Mock.mock(SearchEndpoint);
    const someField: IFieldOption = '@bloupbloup';
    const valueToSearch = 'cowboy';
    const referenceFieldNumberOfResults = 10;
    const suggestion = 'suggestion';

    const setUpLastQuery = (aq: string = '', cq: string = '') => {
      (<jasmine.Spy>queryController.getLastQuery).and.returnValue({
        aq,
        cq
      });
    };

    const setUpFieldValuesBatchResponse = (values: IIndexFieldValue[][]) => {
      const valuesWithReference: IIndexFieldValue[][] = [].concat(values).concat([getReferenceBatchResponse()]);
      (<jasmine.Spy>searchEndpointMock.listFieldValuesBatch).and.returnValue(Promise.resolve(valuesWithReference));
    };

    const getIndexFieldValue = (numberOfResults: number, value: string) => {
      return <IIndexFieldValue>{
        numberOfResults,
        value: value
      };
    };

    const getReferenceBatchResponse = () => {
      return <IIndexFieldValue[]>[getIndexFieldValue(referenceFieldNumberOfResults, suggestion)];
    };

    beforeEach(() => {
      queryController = Mock.mock(QueryController);
      queryStateModel = Mock.mock(QueryStateModel);
      searchEndpointMock = Mock.mock(SearchEndpoint);
      queryController.getLastQuery = jasmine.createSpy('getLastQuery');
      setUpLastQuery();
      queryController.getEndpoint = () => searchEndpointMock;
      searchEndpointMock.listFieldValuesBatch = jasmine.createSpy('listFieldValuesBatch');
      setUpFieldValuesBatchResponse([]);
      test = new FacetValueSuggestionsProvider(queryController, queryStateModel, {
        field: <string>someField
      });
    });

    afterEach(() => {
      test = null;
      queryController = null;
      queryStateModel = null;
      searchEndpointMock = null;
    });

    it('should execute listFieldValuesBatch with value to search and reference', async done => {
      await test.getSuggestions([valueToSearch]);

      expect(searchEndpointMock.listFieldValuesBatch).toHaveBeenCalledWith({
        batch: <IListFieldValuesRequest[]>[
          {
            field: someField,
            ignoreAccents: true,
            maximumNumberOfValues: 3,
            queryOverride: valueToSearch
          },
          {
            field: someField
          }
        ]
      });
      done();
    });

    describe('given field request returns suggestions', () => {
      const fieldRequestNumberOfResults = 1;
      beforeEach(() => {
        setUpFieldValuesBatchResponse([
          [
            {
              value: suggestion,
              numberOfResults: fieldRequestNumberOfResults
            }
          ]
        ]);
      });

      it('returns suggestions for the value to search', async done => {
        const results = await test.getSuggestions([valueToSearch]);

        expect(results.length).toBe(1);
        expect(results[0].value).toBe(suggestion);
        expect(results[0].score.distanceFromTotalForField).not.toBeUndefined();
        done();
      });

      it('should exclude an already selected field value from suggestions', async done => {
        queryStateModel.get = () => [suggestion];

        const results = await test.getSuggestions([valueToSearch]);

        expect(results.length).toBe(0);
        done();
      });
    });

    describe('given field request returns a lot of suggestions', () => {
      beforeEach(() => {
        const response = [1, 2, 3, 4, 5, 6, 7, 8, 9, 10].map(i => getIndexFieldValue(i, i.toString()));
        setUpFieldValuesBatchResponse([response]);
      });

      it('should return the same number of suggestions', async done => {
        const results = await test.getSuggestions([valueToSearch]);

        expect(results.length).toBe(10);
        done();
      });
    });
  });
}