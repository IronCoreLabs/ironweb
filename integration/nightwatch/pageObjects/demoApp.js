const pageAssertions = require('./pageAssertions');

module.exports = {
    commands: [pageAssertions.commands],
    elements: pageAssertions.elements,
    sections: {
        commandBar: require('./commandBar'),
        initializeUser: require('./initializeScreen'),
        documentList: require('./documentListScreen'),
        documentCreate: require('./documentCreateScreen'),
        documentView: require('./documentViewScreen'),
        groupList: require('./groupListScreen'),
        groupCreate: require('./groupCreateScreen'),
        groupDetail: require('./groupDetailScreen'),
    },
};