import { fetchWrapper } from '../actions';
import { submissionApiPath } from '../localconf';


export const clearCounts = () => ({
  type: 'CLEAR_COUNTS',
});

const receiveCounts = ({ status, data }) => {
  switch (status) {
    case 200:
      return {
        type: 'RECEIVE_COUNTS',
        data: data.data,
      };
    default:
      return {
        type: 'FETCH_ERROR',
        error: data.data,
      };
  }
};

/**
 * getCounts: Compose and send a single graphql query to get a count of how 
 *    many of each node and edge are in the current state
 */
export const getCounts = (type, project, dictionary) => {
  let query = '{';

  function appendCountToQuery(element) {
    if (element !== 'metaschema' && !element.startsWith('_')) {
      query += `_${element}_count (project_id:"${project}"),`;
    }
  }

  function appendLinkToQuery(source, dest, name) {
    if (source !== 'metaschema' && !source.startsWith('_')) {
      query += `${source}_to_${dest}_link: ${source}(with_links: ["${name}"], first:1, project_id:"${project}"){submitter_id},`;
    }
  }

  type.forEach((element) => {
    if (element !== 'program') {
      appendCountToQuery(element);
    }
  });

  const nodesToHide = { program: true };
  // Add links to query
  Object.keys(dictionary).filter(
    name => (!name.startsWith('_' && dictionary[name].links))
  ).reduce( // extract links from each node 
    (linkList, name) => {
      const node = dictionary[name];
      const newLinks = node.links;
      return newLinks ? newLinks.map(
        l => ({ source: name, target: l.target_type, name: l.name, })
      ).concat(linkList) : linkList;
    }, []
  ).reduce( // extract subgroups from each link
    (linkList, link) => {
      let result = linkList;
      if (link.target) {
        result.push(link);
      }
      if (link.subgroup) {
        result = link.subgroup.map(
          sg => ({ source: link.source, target: sg.target_type, name: sg.name })
        ).concat(linkList);
      }
      return result;
    }, []
  ).filter(
    l => !nodesToHide[l.source] && !nodesToHide[l.target]
  ).forEach(
    ({ source, target, name }) => appendLinkToQuery(source, target, name)
  );

  query = query.concat('}');
  return fetchWrapper({
    path: `${submissionApiPath}graphql`,
    body: JSON.stringify({
      query,
    }),
    method: 'POST',
    handler: receiveCounts,
  });
};
