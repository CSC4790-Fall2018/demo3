import React, { Component } from "react";
import * as d3 from "d3";

const GraphView = class extends Component {
    async componentDidMount() {
        const res = await fetchGraphData();
        console.log(res);

        const d3json = modifyGraphData(res);
        console.log(d3json);

        renderGraphData(this, d3json);
    }
    render() {
        // Returns jsx to display on application
        return (
            <svg ref={node => (this.node = node)} height={800} width={800} />
        );
    }
};

const fetchGraphData = async () => {
    // Request Data from HTTP endpoint
    const [username, password] = ["neo4j", "neo4j1"];
    const token = Buffer.from(`${username}:${password}`).toString("base64");
    try {
        const response = await fetch(
            "http://localhost:7474/db/data/transaction/commit",
            {
                method: "post",
                headers: {
                    Authorization: `Bearer ${token}`,
                    "Content-Type": "application/json"
                },
                body: JSON.stringify({
                    statements: [
                        {
                            statement:
                                "MATCH path = (n)-[r]->(m) RETURN path LIMIT 25 ",
                            resultDataContents: ["graph"]
                        }
                    ]
                })
            }
        );
        return await response.json();
    } catch (reason) {
        throw reason;
    }
};

const modifyGraphData = response => {
    // Change Cypher response to D3 respresentation
    const { data } = response.results[0];
    return data.reduce(
        (acc, path) => {
            const { nodes, relationships } = path.graph;
            acc.nodes.push(
                ...nodes.filter(node =>
                    acc.nodes.every(entry => entry.id !== node.id)
                )
            );
            acc.links.push(
                ...relationships.map(rel => ({
                    source: rel.startNode,
                    target: rel.endNode
                }))
            );
            return acc;
        },
        { nodes: [], links: [] }
    );
};

const renderGraphData = (context, graph) => {
    const { nodes, links } = graph;
    const node = context.node;
    const width = 800,
        height = 800;

    const simulation = d3
        .forceSimulation(nodes)
        .force("charge", d3.forceManyBody().strength(-20))
        .force("center", d3.forceCenter(width / 2, height / 2))
        .force(
            "link",
            d3
                .forceLink()
                .links(links)
                .id(d => d.id)
        )
        .on("tick", ticked);

    function ticked() {
        const u = d3
            .select(node)
            .selectAll("circle")
            .data(nodes);

        u.enter()
            .append("circle")
            .attr("r", 5)
            .merge(u)
            .attr("cx", d => d.x)
            .attr("cy", d => d.y);
        u.exit().remove();

        const n = d3
            .select(node)
            .selectAll("line")
            .data(links);

        n.enter()
            .append("line")
            .attr("stroke", "black")
            .attr("stroke-width", 2)
            .merge(n)
            .attr("x1", d => d.source.x)
            .attr("y1", d => d.source.y)
            .attr("x2", d => d.target.x)
            .attr("y2", d => d.target.y);
        n.exit().remove();
    }
};

export default GraphView;
