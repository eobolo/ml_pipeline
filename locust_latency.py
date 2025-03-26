from locust import HttpUser, task, between

class MLUser(HttpUser):
    wait_time = between(1, 5)

    @task
    def predict(self):
        self.client.post("/predict", json={"feature1": [2, 1, 2, 3, 1, 2, 1, 3, 2, 1, 4, 3, 2, 1, 3, 2, 4, 3, 2, 1, 2, 3, 1, 2, 3, 1, 2, 3, 4, 5]})