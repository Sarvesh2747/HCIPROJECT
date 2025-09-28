document.addEventListener('DOMContentLoaded', async () => {
    try {
        const response = await fetch('/teacher/dashboard/student-distribution');
        const studentDistribution = await response.json();

        const ctx = document.getElementById('studentDistributionChart').getContext('2d');

        new Chart(ctx, {
            type: 'bar',
            data: {
                labels: studentDistribution.map(item => item.name),
                datasets: [{
                    label: 'Number of Students',
                    data: studentDistribution.map(item => item.studentCount),
                    backgroundColor: 'rgba(54, 162, 235, 0.2)',
                    borderColor: 'rgba(54, 162, 235, 1)',
                    borderWidth: 1
                }]
            },
            options: {
                scales: {
                    y: {
                        beginAtZero: true
                    }
                }
            }
        });
    } catch (error) {
        console.error('Error fetching or rendering chart:', error);
    }
});
